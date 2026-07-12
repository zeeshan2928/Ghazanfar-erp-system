import * as XLSX from 'xlsx';
import { AdaptiveImportService } from './adaptive-import.service';

function buf(rows: (string | number)[][]): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('AdaptiveImportService', () => {
  const svc = new AdaptiveImportService();

  it('detects the flat year-sales layout, salesman, discount, and returns netting', () => {
    const rows = [
      ['Ghazanfar Brothers\nProduct Billing Ledger'],
      ['Item Name', 'Invoice IDs', 'Date Time', 'Account', 'Customer Name', 'Warehouse Name', 'Category', 'Brand', 'type', 'Units Sold', 'Sale Price', 'Actual Price', 'Total Amount', 'Employee Name'],
      ['405 Sandwich Maker', '124 - 4582', '31/Jan/25', 'Walk In Customer', 'Ali Furniture', 'Asghari', 'Sandwich Maker', 'Default', 'CASH', '2', '2150', '2250', '4300', 'Yasir Abbas'],
      ['5880 Kenwood Food Factory', '124 - 4582', '31/Jan/25', 'Walk In Customer', 'Ali Furniture', 'Asghari', 'Food Pro', 'Seco', 'CREDIT', '1', '8500', '9500', '8500', 'Qurban Ahmad'],
      ['128 Dawlance Microwave', '124 - 5000', '02/Feb/25', 'Walk In Customer', 'Rana Abid', 'Asghari', 'Microwave Oven', 'Dawlance', 'RETURN', '1', '29800', '30500', '29800', 'Yasir Abbas'],
    ];
    const res = svc.analyze(buf(rows), 'SALES');
    expect(res.headerRowIndex).toBe(1);
    expect(res.structure).toBe('FLAT');
    expect(res.unmappedRequired).toHaveLength(0);
    // salesman detected via "Employee Name"
    expect(res.mapping.salesmanName).toBe(13);
    expect(res.mapping.category).toBe(6);
    expect(res.mapping.brand).toBe(7);
    expect(res.mapping.actualPrice).toBe(11);

    const all = svc.readRows(svc.readSheet(buf(rows)), res.headerRowIndex, res.mapping, res.structure);
    expect(all).toHaveLength(3);
    const ret = all.find(r => r.itemRaw.startsWith('128'))!;
    expect(ret.isReturn).toBe(true);
    expect(ret.quantity).toBe(-1); // returns net out
    expect(ret.lineAmount).toBe(-29800);
    const sale = all.find(r => r.itemRaw.startsWith('405'))!;
    expect(sale.quantity).toBe(2);
    expect(sale.productCode).toBe('405');
    expect(sale.salesmanName).toBe('Yasir Abbas');
    expect(sale.paymentMethod).toBe('CASH');
    expect(sale.transactionDate?.getFullYear()).toBe(2025);
  });

  it('handles a multi-row-per-bill layout via carry-forward', () => {
    const rows = [
      ['Detail Sale Report'],
      ['Date Time', 'Manual Sales Number', 'Account Name', 'Customer Name', 'type', 'Item', 'Quantity', 'Sold Price', 'Amount'],
      ['09-Jul-26', '731-21329', 'Walk In Customer', 'Nizam Watch', 'CASH', '', '', '', '13000'],
      ['', '', '', '', 'Sale', '15 MD Dawlance Microwave', '1', '13000', ''],
      ['', '', '', '', 'Sale', '222 Kenwood Oven', '2', '5000', ''],
    ];
    const res = svc.analyze(buf(rows), 'SALES');
    expect(res.structure).toBe('MULTI_ROW');
    const all = svc.readRows(svc.readSheet(buf(rows)), res.headerRowIndex, res.mapping, res.structure);
    expect(all).toHaveLength(2);
    // date + bill carried forward onto the line rows
    expect(all[0].billNumber).toBe('731-21329');
    expect(all[1].billNumber).toBe('731-21329');
    expect(all[0].transactionDate?.getFullYear()).toBe(2026);
    expect(all[0].lineSequence).toBe(1);
    expect(all[1].lineSequence).toBe(2);
  });

  it('detects a flat purchase layout (different headers)', () => {
    const rows = [
      ['Product Batch Report'],
      ['Account', 'Date Time', 'Item Name', 'Stock IDs', 'Warehouse Name', 'Type', 'Units', 'Per Item Price', 'Total Amount', 'User Name'],
      ['Saddam Bhai', '01-Sep-25', '600 St Blender', '124 - 13', 'Office', 'Purchase', '10', '2200', '22000', 'Afil Zuz'],
    ];
    const res = svc.analyze(buf(rows), 'PURCHASE');
    expect(res.unmappedRequired).toHaveLength(0);
    expect(res.mapping.vendorName).toBe(0); // "Account" -> vendor on purchase side
    expect(res.mapping.billNumber).toBe(3); // "Stock IDs"
    const all = svc.readRows(svc.readSheet(buf(rows)), res.headerRowIndex, res.mapping, res.structure);
    expect(all[0].unitPrice).toBe(2200);
    expect(all[0].vendorName).toBe('Saddam Bhai');
  });

  it('computes a stable signature and reuses a provided template mapping', () => {
    const rows = [
      ['Item Name', 'Invoice IDs', 'Date Time', 'Units Sold', 'Sale Price'],
      ['176 Juicer', '124 - 1', '01/Jan/25', '1', '5000'],
    ];
    const first = svc.analyze(buf(rows), 'SALES');
    const sig1 = first.signature;
    // A template mapping (e.g. remembered) is applied verbatim and flagged.
    const withTemplate = svc.analyze(buf(rows), 'SALES', first.mapping, first.structure);
    expect(withTemplate.matchedTemplate).toBe(true);
    expect(withTemplate.signature).toBe(sig1);
    expect(withTemplate.mapping.itemRaw).toBe(0);
  });
});
