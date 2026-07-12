import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  AnalyzeResult,
  CanonicalField,
  CanonicalRow,
  CARRY_FORWARD_FIELDS,
  ColumnMapping,
  DetectedColumn,
  FIELD_SETS,
  FieldSpec,
  ImportModule,
  Structure,
} from './adaptive-import.types';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// One engine that "studies" an arbitrary spreadsheet: finds the header row,
// guesses which column is which canonical field (header synonyms + data
// value patterns), detects flat vs multi-row-per-bill layout, and reads rows
// into canonical records through a confirmed mapping. Format-agnostic by
// design - the caller/user confirms the mapping, so novel layouts still work.
@Injectable()
export class AdaptiveImportService {
  readSheet(buffer: Buffer): string[][] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const name = wb.SheetNames[0];
    if (!name) throw new BadRequestException('File has no sheets');
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
  }

  analyze(
    buffer: Buffer,
    module: ImportModule,
    templateMapping?: ColumnMapping,
    templateStructure?: Structure,
  ): AnalyzeResult {
    const rows = this.readSheet(buffer);
    if (rows.length === 0) throw new BadRequestException('File is empty');

    const specs = FIELD_SETS[module];
    const headerRowIndex = this.findHeaderRow(rows, specs);
    const columns = this.buildColumns(rows, headerRowIndex);
    const maxCols = columns.length;

    let mapping: ColumnMapping;
    let confidence: Partial<Record<CanonicalField, number>> = {};
    let matchedTemplate = false;

    if (templateMapping && Object.keys(templateMapping).length > 0) {
      // A remembered layout matched - trust it, but keep only columns that
      // still exist in this file.
      mapping = {};
      for (const [field, idx] of Object.entries(templateMapping)) {
        if (typeof idx === 'number' && idx < maxCols) mapping[field as CanonicalField] = idx;
      }
      matchedTemplate = true;
    } else {
      const detected = this.detectMapping(rows, headerRowIndex, columns, specs);
      mapping = detected.mapping;
      confidence = detected.confidence;
    }

    const structure = templateStructure || this.detectStructure(rows, headerRowIndex, mapping);
    const unmappedRequired = specs.filter(s => s.required && mapping[s.field] === undefined).map(s => s.label);
    const preview = this.readRows(rows, headerRowIndex, mapping, structure, 20);

    return {
      headerRowIndex,
      columns,
      mapping,
      confidence,
      structure,
      signature: this.computeSignature(columns),
      unmappedRequired,
      matchedTemplate,
      preview,
    };
  }

  // Build the column list (header + sample values) from an already-read
  // sheet, so callers that have the sheet don't re-parse the file.
  buildColumns(rows: string[][], headerRowIndex: number): DetectedColumn[] {
    const headerRow = rows[headerRowIndex] || [];
    const maxCols = Math.max(...rows.map(r => r.length), headerRow.length);
    const columns: DetectedColumn[] = [];
    for (let c = 0; c < maxCols; c++) {
      columns.push({
        index: c,
        header: String(headerRow[c] ?? '').trim(),
        sampleValues: this.sampleColumn(rows, headerRowIndex, c, 5),
      });
    }
    return columns;
  }

  // Stable fingerprint of a layout = sorted, normalized non-empty headers.
  // Used to recognize a recurring export and reuse its saved mapping.
  computeSignature(columns: DetectedColumn[]): string {
    return columns
      .map(c => this.norm(c.header))
      .filter(h => h !== '')
      .sort()
      .join('|');
  }

  // ---- header row detection ----
  private findHeaderRow(rows: string[][], specs: FieldSpec[]): number {
    const allSyn = new Set(specs.flatMap(s => s.synonyms));
    let best = 0;
    let bestScore = -1;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const cells = (rows[r] || []).map(c => this.norm(c)).filter(c => c !== '');
      if (cells.length === 0) continue;
      let hits = 0;
      for (const cell of cells) {
        if (allSyn.has(cell) || [...allSyn].some(s => cell.includes(s) || s.includes(cell))) hits++;
      }
      // Prefer rows with more recognized headers; tie-break toward more cells.
      const score = hits * 100 + cells.length;
      if (hits > 0 && score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best;
  }

  private sampleColumn(rows: string[][], headerRowIndex: number, col: number, n: number): string[] {
    const out: string[] = [];
    for (let r = headerRowIndex + 1; r < rows.length && out.length < n; r++) {
      const v = String(rows[r]?.[col] ?? '').trim();
      if (v !== '') out.push(v);
    }
    return out;
  }

  // ---- mapping detection: header synonyms + value heuristics ----
  private detectMapping(
    rows: string[][],
    headerRowIndex: number,
    columns: DetectedColumn[],
    specs: FieldSpec[],
  ): { mapping: ColumnMapping; confidence: Partial<Record<CanonicalField, number>> } {
    // Profile each column's data values once.
    const profiles = columns.map(c => this.profileColumn(rows, headerRowIndex, c.index));

    const candidates: { field: CanonicalField; col: number; score: number }[] = [];
    for (const spec of specs) {
      for (const col of columns) {
        const h = this.norm(col.header);
        let headerScore = 0;
        if (h !== '') {
          if (spec.synonyms.includes(h)) headerScore = 1;
          else if (spec.synonyms.some(s => h.includes(s) || s.includes(h))) headerScore = 0.6;
        }
        const valueScore = this.fieldAffinity(spec.field, profiles[col.index]);
        const score = headerScore + valueScore;
        if (score >= 0.5) candidates.push({ field: spec.field, col: col.index, score });
      }
    }

    // Greedy: highest score first; each field and each column used once.
    candidates.sort((a, b) => b.score - a.score);
    const mapping: ColumnMapping = {};
    const confidence: Partial<Record<CanonicalField, number>> = {};
    const usedCols = new Set<number>();
    for (const cand of candidates) {
      if (mapping[cand.field] !== undefined || usedCols.has(cand.col)) continue;
      mapping[cand.field] = cand.col;
      confidence[cand.field] = Math.min(1, cand.score);
      usedCols.add(cand.col);
    }
    return { mapping, confidence };
  }

  private profileColumn(rows: string[][], headerRowIndex: number, col: number) {
    const vals: string[] = [];
    for (let r = headerRowIndex + 1; r < rows.length && vals.length < 60; r++) {
      const v = String(rows[r]?.[col] ?? '').trim();
      if (v !== '') vals.push(v);
    }
    const n = vals.length || 1;
    let date = 0, int = 0, money = 0, item = 0, bill = 0;
    for (const v of vals) {
      if (this.parseDate(v)) date++;
      const num = this.parseNumber(v);
      if (num !== null && Number.isInteger(num) && Math.abs(num) < 1_000_000) int++;
      if (num !== null) money++;
      if (/^\d+\s+\S/.test(v) || (/[a-z]/i.test(v) && v.length > 6 && num === null)) item++;
      if (/\d+\s*-\s*\d+/.test(v)) bill++;
    }
    return { date: date / n, int: int / n, money: money / n, item: item / n, bill: bill / n };
  }

  private fieldAffinity(field: CanonicalField, p: { date: number; int: number; money: number; item: number; bill: number }): number {
    switch (field) {
      case 'transactionDate': return p.date > 0.7 ? 0.4 : 0;
      case 'billNumber': return p.bill > 0.5 ? 0.35 : 0;
      case 'itemRaw': return p.item > 0.6 && p.money < 0.5 ? 0.35 : 0;
      case 'quantity': return p.int > 0.8 && p.money > 0.8 ? 0.15 : 0; // weak; header should decide
      default: return 0;
    }
  }

  // ---- structure detection ----
  private detectStructure(rows: string[][], headerRowIndex: number, mapping: ColumnMapping): Structure {
    const dateCol = mapping.transactionDate;
    const itemCol = mapping.itemRaw;
    if (dateCol === undefined || itemCol === undefined) return 'FLAT';
    let itemRows = 0;
    let itemRowsWithBlankDate = 0;
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const item = String(rows[r]?.[itemCol] ?? '').trim();
      if (item === '') continue;
      itemRows++;
      if (String(rows[r]?.[dateCol] ?? '').trim() === '') itemRowsWithBlankDate++;
    }
    if (itemRows === 0) return 'FLAT';
    // If most item rows lack their own date, dates live on separate header
    // rows => multi-row-per-bill.
    return itemRowsWithBlankDate / itemRows > 0.5 ? 'MULTI_ROW' : 'FLAT';
  }

  // ---- unified row reader (handles both flat and multi-row) ----
  // Any row carrying an item becomes a record; context fields (date, bill,
  // customer, salesman, ...) are carried forward from the last row that had
  // them, which is a no-op for a flat file and exactly what a multi-row
  // layout needs. Returns up to `limit` rows (undefined = all).
  readRows(
    rows: string[][],
    headerRowIndex: number,
    mapping: ColumnMapping,
    _structure: Structure,
    limit?: number,
  ): CanonicalRow[] {
    const get = (row: string[], field: CanonicalField): string => {
      const idx = mapping[field];
      if (idx === undefined) return '';
      return String(row[idx] ?? '').trim();
    };

    const carry: Partial<Record<CanonicalField, string>> = {};
    const out: CanonicalRow[] = [];
    const seqByBill = new Map<string, number>();

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const isBlank = row.every(c => String(c ?? '').trim() === '');
      if (isBlank) continue;

      // Update carry-forward context from any header-ish fields present here.
      for (const f of CARRY_FORWARD_FIELDS) {
        const v = get(row, f);
        if (v !== '') carry[f] = v;
      }

      const itemRaw = get(row, 'itemRaw');
      if (itemRaw === '') continue; // header/subtotal/total row - context only

      const quantity = this.parseNumber(get(row, 'quantity'));
      const unitPrice = this.parseNumber(get(row, 'unitPrice'));
      if (quantity === null && unitPrice === null) continue; // not a real line

      const dateStr = carry.transactionDate ?? get(row, 'transactionDate');
      const transactionDate = this.parseDate(dateStr || '');
      const billNumber = (carry.billNumber ?? get(row, 'billNumber')) || `UNKNOWN-${r + 1}`;

      const typeStr = (carry.transactionType ?? get(row, 'transactionType') ?? '').toLowerCase();
      const isReturn = /return|refund/.test(typeStr);
      const paymentMethod = isReturn ? null : (carry.transactionType ?? '') || null;

      const qtyAbs = quantity ?? 0;
      const priceAbs = unitPrice ?? 0;
      const lineAmountRaw = this.parseNumber(get(row, 'lineAmount'));
      const lineAbs = lineAmountRaw !== null ? Math.abs(lineAmountRaw) : qtyAbs * priceAbs;
      const actualPrice = this.parseNumber(get(row, 'actualPrice'));

      const sign = isReturn ? -1 : 1;
      const seq = (seqByBill.get(billNumber) || 0) + 1;
      seqByBill.set(billNumber, seq);

      const codeMatch = itemRaw.match(/^(\d+)\s+(.+)$/);

      out.push({
        transactionDate,
        billNumber,
        lineSequence: seq,
        itemRaw,
        productCode: codeMatch ? codeMatch[1] : null,
        quantity: sign * Math.abs(qtyAbs),
        unitPrice: priceAbs,
        actualPrice: actualPrice !== null ? Math.abs(actualPrice) : null,
        lineAmount: sign * lineAbs,
        accountName: (carry.accountName ?? get(row, 'accountName')) || null,
        customerName: (carry.customerName ?? get(row, 'customerName')) || null,
        vendorName: (carry.vendorName ?? get(row, 'vendorName')) || null,
        salesmanName: (carry.salesmanName ?? get(row, 'salesmanName')) || null,
        category: get(row, 'category') || null,
        brand: get(row, 'brand') || null,
        warehouseName: (carry.warehouseName ?? get(row, 'warehouseName')) || null,
        paymentMethod: paymentMethod ? paymentMethod.toUpperCase() : null,
        isReturn,
      });

      if (limit !== undefined && out.length >= limit) break;
    }
    return out;
  }

  // ---- shared parsers ----
  private norm(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  parseNumber(raw: string | null | undefined): number | null {
    if (raw === null || raw === undefined) return null;
    const cleaned = String(raw).replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '.') return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  parseDate(raw: string): Date | null {
    const t = (raw || '').trim();
    if (t === '') return null;
    // DD-MMM-YY / DD/MMM/YY  e.g. 09-Jul-26, 31/Jan/25
    let m = t.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = MONTHS[m[2].toLowerCase()];
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      if (month === undefined) return null;
      return new Date(year, month, day);
    }
    // DD-MM-YYYY / DD/MM/YYYY
    m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    // Excel serial (rare, since we read formatted text)
    if (/^\d{5}$/.test(t)) {
      const serial = parseInt(t, 10);
      if (serial > 30000 && serial < 60000) return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    }
    const generic = new Date(t);
    return Number.isNaN(generic.getTime()) ? null : generic;
  }
}
