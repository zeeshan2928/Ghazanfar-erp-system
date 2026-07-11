import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export type AssemblyFamily = 'JUICER' | 'BLENDER';

export interface ParsedComponent {
  name: string;
  cost: number;
}

export interface ParsedFormula {
  label: string;
  family: AssemblyFamily;
  productCodes: string[];
  components: ParsedComponent[];
  statedTotal: number | null; // the file's own "Total Amount" row, for cross-check
  computedTotal: number; // sum of component costs
  warnings: string[];
}

export interface AssemblyParseResult {
  formulas: ParsedFormula[];
  warnings: string[];
}

// The BOM spreadsheets lay models out as side-by-side COLUMN PAIRS
// (name | cost), repeating every 2 columns across a sheet. A dedicated
// single-model file is just the n=1 degenerate case of the same layout, so
// one detector handles both with no branching. Each pair's rows run from
// under the label down to a "Total Amount" row.
@Injectable()
export class AssemblyFormulaParserService {
  parse(buffer: Buffer, originalFileName: string): AssemblyParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException(`File ${originalFileName} has no sheets`);
    }

    const formulas: ParsedFormula[] = [];
    const warnings: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });
      if (rows.length === 0) continue;

      const maxCols = Math.max(...rows.map(r => r.length));

      // Walk columns in pairs: (0,1), (2,3), (4,5), ...
      for (let col = 0; col + 1 < maxCols || col < maxCols; col += 2) {
        const parsed = this.parsePair(rows, col, sheetName, originalFileName);
        if (parsed === 'STOP') break; // fully-empty pair => no more models on this sheet
        if (parsed === 'SKIP') continue;
        formulas.push(parsed);
      }
    }

    if (formulas.length === 0) {
      throw new BadRequestException(
        `No assembly formulas could be parsed from ${originalFileName}`,
      );
    }

    return { formulas, warnings };
  }

  private parsePair(
    rows: string[][],
    col: number,
    sheetName: string,
    sourceFile: string,
  ): ParsedFormula | 'SKIP' | 'STOP' {
    // Label is the first non-empty left-column cell in this pair's range.
    let labelRow = -1;
    let label = '';
    for (let r = 0; r < rows.length; r++) {
      const v = this.cell(rows, r, col);
      if (v !== '') {
        label = v;
        labelRow = r;
        break;
      }
    }

    if (labelRow === -1) {
      // Nothing at all in this column pair - end of models on this sheet.
      return 'STOP';
    }

    const components: ParsedComponent[] = [];
    let statedTotal: number | null = null;
    const warnings: string[] = [];

    for (let r = labelRow + 1; r < rows.length; r++) {
      const name = this.cell(rows, r, col);
      const costRaw = this.cell(rows, r, col + 1);
      if (name === '' && costRaw === '') continue;

      if (this.norm(name) === 'total amount') {
        statedTotal = this.parseNumber(costRaw);
        break;
      }

      const cost = this.parseNumber(costRaw);
      if (cost === null) {
        // A named row with no parseable cost - skip but note it.
        if (name !== '') warnings.push(`"${label}": component "${name}" has no cost, skipped`);
        continue;
      }
      components.push({ name, cost });
    }

    if (components.length === 0) {
      // A label with no usable components (e.g. an empty template column).
      return 'SKIP';
    }

    const family: AssemblyFamily = components.some(c => this.norm(c.name).includes('jug plastic'))
      ? 'BLENDER'
      : 'JUICER';

    const computedTotal = components.reduce((sum, c) => sum + c.cost, 0);
    if (statedTotal !== null && Math.abs(statedTotal - computedTotal) > 1) {
      warnings.push(
        `"${label}": stated total ${statedTotal} != sum of components ${computedTotal.toFixed(2)}`,
      );
    }

    return {
      label,
      family,
      productCodes: this.extractProductCodes(label),
      components,
      statedTotal,
      computedTotal,
      warnings,
    };
  }

  // Best-effort: pull numeric code tokens out of a label like
  // "HS+MS+9900+8600+2222 (7025CC)" -> ["9900","8600","2222"] or
  // "St 446+444 Juicer" -> ["446","444"]. Not required to be perfect - kept
  // only for future matching against real ERP product codes.
  private extractProductCodes(label: string): string[] {
    const beforeParen = label.split('(')[0];
    const tokens = beforeParen.split(/[+\s]+/);
    const codes = tokens
      .map(t => t.trim())
      .filter(t => /^\d{2,}$/.test(t)); // pure numbers, 2+ digits
    return [...new Set(codes)];
  }

  private cell(rows: string[][], r: number, c: number): string {
    const row = rows[r];
    if (!row) return '';
    return String(row[c] ?? '').trim();
  }

  private norm(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private parseNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const cleaned = String(raw).replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '.') return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
}
