import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedSaleLine {
  billNumber: string;
  lineSequence: number;
  transactionDate: Date;
  accountName: string | null;
  customerName: string | null;
  salesmanName: string | null;
  itemRaw: string;
  productCode: string | null;
  quantity: number;
  soldPrice: number;
  lineAmount: number;
}

export interface ParseResult {
  lines: ParsedSaleLine[];
  reportStartDate: Date;
  reportEndDate: Date;
  warnings: string[];
}

// Column header synonyms - the same source system may export a slightly
// different column set over time (e.g. a salesman column added later), so
// detection is by header name, not fixed column position.
const HEADER_SYNONYMS: Record<string, string[]> = {
  dateTime: ['date time', 'date'],
  billNumber: ['manual sales number', 'bill number', 'invoice number'],
  accountName: ['account name'],
  customerName: ['customer name'],
  type: ['type'],
  billType: ['bill type'],
  item: ['item'],
  quantity: ['quantity'],
  soldPrice: ['sold price', 'unit price'],
  salesman: ['salesman', 'sales man', 'employee', 'salesperson'],
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

@Injectable()
export class SalesAnalysisParserService {
  parse(buffer: Buffer, originalFileName: string): ParseResult {
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
        `Could not find a header row with recognizable columns (expected "Date Time" and "Manual Sales Number") in ${originalFileName}`,
      );
    }

    const { rowIndex: headerRowIndex, index } = columnIndex;
    const lines: ParsedSaleLine[] = [];
    const warnings: string[] = [];

    let currentBill: {
      billNumber: string;
      transactionDate: Date;
      accountName: string | null;
      customerName: string | null;
      salesmanName: string | null;
      lineSequence: number;
      lineSum: number;
    } | null = null;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const cell = (key: string): string => this.cellAt(row, index, key);

      const isBlank = row.every(c => this.norm(c) === '');
      if (isBlank) continue;

      const dateTimeRaw = cell('dateTime');
      const itemRaw = cell('item');
      const quantityRaw = cell('quantity');
      const amountLikePresent = quantityRaw !== '';

      if (dateTimeRaw !== '') {
        // Bill header row - starts a new bill context.
        const transactionDate = this.parseDate(dateTimeRaw);
        if (!transactionDate) {
          warnings.push(`Row ${r + 1}: could not parse date "${dateTimeRaw}" - bill skipped`);
          currentBill = null;
          continue;
        }
        currentBill = {
          billNumber: cell('billNumber') || `UNKNOWN-${r + 1}`,
          transactionDate,
          accountName: cell('accountName') || null,
          customerName: cell('customerName') || null,
          salesmanName: index.salesman !== undefined ? cell('salesman') || null : null,
          lineSequence: 0,
          lineSum: 0,
        };
        continue;
      }

      if (itemRaw !== '') {
        // Line-item row belonging to the current bill context.
        if (!currentBill) {
          warnings.push(`Row ${r + 1}: line item "${itemRaw}" found with no preceding bill header - skipped`);
          continue;
        }
        const quantity = this.parseNumber(quantityRaw);
        const soldPrice = this.parseNumber(cell('soldPrice'));
        if (quantity === null || soldPrice === null) {
          warnings.push(`Row ${r + 1}: could not parse quantity/price for "${itemRaw}" - skipped`);
          continue;
        }
        const lineAmount = quantity * soldPrice;
        currentBill.lineSequence += 1;
        currentBill.lineSum += lineAmount;

        const productCodeMatch = itemRaw.match(/^(\d+)\s+(.+)$/);

        lines.push({
          billNumber: currentBill.billNumber,
          lineSequence: currentBill.lineSequence,
          transactionDate: currentBill.transactionDate,
          accountName: currentBill.accountName,
          customerName: currentBill.customerName,
          salesmanName: currentBill.salesmanName,
          itemRaw,
          productCode: productCodeMatch ? productCodeMatch[1] : null,
          quantity,
          soldPrice,
          lineAmount,
        });
        continue;
      }

      if (amountLikePresent) {
        // A totals-only row (no date, no item) - either a per-bill subtotal
        // or the file's final grand-total row. Used only to sanity-check
        // the parse, never persisted as a transaction line.
        if (currentBill) {
          const rowAmount = this.parseNumber(this.rawAmountCell(row, index));
          if (rowAmount !== null && Math.abs(rowAmount - currentBill.lineSum) > 0.5) {
            warnings.push(
              `Bill ${currentBill.billNumber}: subtotal row (${rowAmount}) does not match summed line items (${currentBill.lineSum.toFixed(2)})`,
            );
          }
          currentBill = null;
        }
        continue;
      }

      warnings.push(`Row ${r + 1}: unrecognized row shape, skipped`);
    }

    if (lines.length === 0) {
      throw new BadRequestException('No transaction lines could be parsed from this file');
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

      if (index.dateTime !== undefined && index.billNumber !== undefined) {
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

  private rawAmountCell(row: string[], index: Record<string, number>): string {
    // "Quantity" column doubles as the subtotal/grand-total row's amount
    // indicator position-wise is unreliable across exports, so fall back to
    // scanning for the last non-empty numeric-looking cell in the row.
    for (let i = row.length - 1; i >= 0; i--) {
      const v = String(row[i] ?? '').trim();
      if (v !== '' && /[\d,]/.test(v)) return v;
    }
    return '';
  }

  private parseNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, '').replace(/\.$/, m => m).trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  private parseDate(raw: string): Date | null {
    const trimmed = raw.trim();
    // Format observed: "09-Jul-26" (DD-MMM-YY)
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
    // Fallback: format observed on the bill-header display, "DD-MM-YYYY"
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
