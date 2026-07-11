import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedPurchaseLine {
  billNumber: string;
  lineSequence: number;
  transactionDate: Date;
  vendorName: string | null;
  itemRaw: string;
  productCode: string | null;
  quantity: number;
  purchasePrice: number;
  lineAmount: number;
}

export interface PurchaseParseResult {
  lines: ParsedPurchaseLine[];
  reportStartDate: Date;
  reportEndDate: Date;
  warnings: string[];
}

// Real sample file ("Product Batch Report") is a FLAT one-row-per-line
// report - unlike the sales report's multi-row-per-bill shape, every
// populated row is fully self-contained. "Stock IDs" groups a handful of
// product lines into one purchase batch/receipt (the closest analog to a
// bill number here), reused as the dedupe grouping key the same way
// billNumber is on the sales side. Column detection is still by header
// name, not position, for the same reason as the sales parser.
const HEADER_SYNONYMS: Record<string, string[]> = {
  account: ['account'],
  dateTime: ['date time', 'date'],
  item: ['item name', 'item'],
  stockId: ['stock ids', 'stock id'],
  warehouse: ['warehouse name', 'warehouse'],
  type: ['type'],
  units: ['units', 'quantity'],
  perItemPrice: ['per item price', 'unit price'],
  totalAmount: ['total amount', 'amount'],
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

@Injectable()
export class PurchaseAnalysisParserService {
  parse(buffer: Buffer, originalFileName: string): PurchaseParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File has no sheets/rows to read');
    }
    const sheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    const columnIndex = this.detectColumns(rows);
    if (columnIndex === null) {
      throw new BadRequestException(
        `Could not find a header row with recognizable columns (expected "Account" and "Date Time") in ${originalFileName}`,
      );
    }

    const { rowIndex: headerRowIndex, index } = columnIndex;
    const lines: ParsedPurchaseLine[] = [];
    const warnings: string[] = [];
    const lineSequenceByBatch = new Map<string, number>();
    let skippedNonPurchase = 0;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const cell = (key: string): string => this.cellAt(row, index, key);

      const isBlank = row.every(c => this.norm(c) === '');
      if (isBlank) continue;

      const accountRaw = cell('account');
      const dateTimeRaw = cell('dateTime');
      const itemRaw = cell('item');

      if (!accountRaw && !dateTimeRaw && !itemRaw) {
        // Grand-total row (no context, only Units/Total Amount populated) -
        // used only as an end-to-end sanity check, never persisted.
        continue;
      }

      if (!dateTimeRaw || !itemRaw) {
        warnings.push(`Row ${r + 1}: missing date or item, skipped`);
        continue;
      }

      const type = cell('type');
      if (type && type.toLowerCase() !== 'purchase') {
        skippedNonPurchase++;
        continue;
      }

      const transactionDate = this.parseDate(dateTimeRaw);
      if (!transactionDate) {
        warnings.push(`Row ${r + 1}: could not parse date "${dateTimeRaw}" - skipped`);
        continue;
      }

      const quantity = this.parseNumber(cell('units'));
      const purchasePrice = this.parseNumber(cell('perItemPrice'));
      const lineAmount = this.parseNumber(cell('totalAmount'));

      if (quantity === null || purchasePrice === null || lineAmount === null) {
        warnings.push(`Row ${r + 1}: "${itemRaw}" has no recorded price - skipped (quantity/price/amount incomplete)`);
        continue;
      }

      const stockId = cell('stockId') || `UNKNOWN-${r + 1}`;
      const nextSeq = (lineSequenceByBatch.get(stockId) || 0) + 1;
      lineSequenceByBatch.set(stockId, nextSeq);

      const productCodeMatch = itemRaw.match(/^(\d+)\s+(.+)$/);

      lines.push({
        billNumber: stockId,
        lineSequence: nextSeq,
        transactionDate,
        vendorName: accountRaw || null,
        itemRaw,
        productCode: productCodeMatch ? productCodeMatch[1] : null,
        quantity,
        purchasePrice,
        lineAmount,
      });
    }

    if (skippedNonPurchase > 0) {
      warnings.push(`${skippedNonPurchase} row(s) had a Type other than "Purchase" - skipped`);
    }

    if (lines.length === 0) {
      throw new BadRequestException('No purchase lines could be parsed from this file');
    }

    const dates = lines.map(l => l.transactionDate.getTime());
    return {
      lines,
      reportStartDate: new Date(Math.min(...dates)),
      reportEndDate: new Date(Math.max(...dates)),
      warnings,
    };
  }

  private detectColumns(
    rows: string[][],
  ): { rowIndex: number; index: Record<string, number> } | null {
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] || [];
      const normalized = row.map(c => this.norm(c));
      const index: Record<string, number> = {};

      for (const [key, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        const foundAt = normalized.findIndex(cell => synonyms.includes(cell));
        if (foundAt !== -1) index[key] = foundAt;
      }

      if (index.account !== undefined && index.dateTime !== undefined && index.item !== undefined) {
        return { rowIndex: r, index };
      }
    }
    return null;
  }

  private norm(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private cellAt(row: string[], index: Record<string, number>, key: string): string {
    const i = index[key];
    if (i === undefined) return '';
    return String(row[i] ?? '').trim();
  }

  private parseNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, '').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  private parseDate(raw: string): Date | null {
    const trimmed = raw.trim();
    const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthKey = match[2].toLowerCase();
      const month = MONTHS[monthKey];
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      if (month === undefined) return null;
      return new Date(year, month, day);
    }
    const altMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (altMatch) {
      const day = parseInt(altMatch[1], 10);
      const month = parseInt(altMatch[2], 10) - 1;
      const year = parseInt(altMatch[3], 10);
      return new Date(year, month, day);
    }
    const generic = new Date(trimmed);
    return Number.isNaN(generic.getTime()) ? null : generic;
  }
}
