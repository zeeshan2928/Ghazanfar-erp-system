import * as XLSX from 'xlsx';
import { AssemblyFormulaParserService } from './assembly-formula-parser.service';

// Builds an in-memory .xlsx buffer from a 2D array of rows, so these tests
// have no dependency on the real BOM files living outside the repo.
function makeBuffer(sheets: Record<string, (string | number)[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('AssemblyFormulaParserService', () => {
  const parser = new AssemblyFormulaParserService();

  it('parses a single dedicated-file model with the correct total (GB ST 176 -> 4129)', () => {
    // Faithful subset of the real "GB ST 176 (7025CC)" file shape: one
    // label, one name|cost column pair, terminated by a Total Amount row.
    const buffer = makeBuffer({
      Sheet1: [
        ['GB ST 176 (7025CC)', ''],
        ['Complete Body Pure', 1630],
        ['Motor 7025CC', 840],
        ['Jug Glass + Chori', 550],
        ['Jali', 365],
        ['Box', 90],
        ['Labor', 30],
        ['Rest Of Parts', 624],
        ['Total Amount', 4129],
      ],
    });

    const res = parser.parse(buffer, 'GB ST 176 (7025CC).xlsx');
    expect(res.formulas).toHaveLength(1);
    const f = res.formulas[0];
    expect(f.label).toBe('GB ST 176 (7025CC)');
    expect(f.family).toBe('JUICER');
    expect(f.productCodes).toEqual(['176']);
    expect(f.components).toHaveLength(7);
    expect(f.computedTotal).toBe(4129);
    expect(f.statedTotal).toBe(4129);
    expect(f.warnings).toHaveLength(0);
  });

  it('detects BLENDER family from a "Jug Plastic" component', () => {
    const buffer = makeBuffer({
      Sheet1: [
        ['555+718 (7015CC)', ''],
        ['Complete Body', 140],
        ['Jug Plastic', 198],
        ['Motor', 500],
        ['Total Amount', 838],
      ],
    });
    const res = parser.parse(buffer, 'blender.xlsx');
    expect(res.formulas[0].family).toBe('BLENDER');
    expect(res.formulas[0].productCodes).toEqual(['555', '718']);
  });

  it('parses multiple side-by-side model column-pairs on one sheet', () => {
    const buffer = makeBuffer({
      Sheet1: [
        ['Model A', '', 'Model B', ''],
        ['Motor', 800, 'Motor', 900],
        ['Box', 80, 'Box', 85],
        ['Total Amount', 880, 'Total Amount', 985],
      ],
    });
    const res = parser.parse(buffer, 'master.xlsx');
    expect(res.formulas).toHaveLength(2);
    expect(res.formulas.map(f => f.label)).toEqual(['Model A', 'Model B']);
    expect(res.formulas[0].computedTotal).toBe(880);
    expect(res.formulas[1].computedTotal).toBe(985);
  });

  it('warns when a stated total disagrees with the component sum', () => {
    const buffer = makeBuffer({
      Sheet1: [
        ['Mismatch Model', ''],
        ['Motor', 800],
        ['Box', 100],
        ['Total Amount', 999], // real sum is 900
      ],
    });
    const res = parser.parse(buffer, 'x.xlsx');
    expect(res.formulas[0].computedTotal).toBe(900);
    expect(res.formulas[0].warnings.some(w => w.includes('stated total'))).toBe(true);
  });

  it('skips a component row that has no cost, with a warning', () => {
    const buffer = makeBuffer({
      Sheet1: [
        ['Gappy Model', ''],
        ['Motor', 800],
        ['Shelving', ''], // blank cost, like the real "St 4440 Juicer" file
        ['Total Amount', 800],
      ],
    });
    const res = parser.parse(buffer, 'x.xlsx');
    expect(res.formulas[0].components).toHaveLength(1);
    expect(res.formulas[0].warnings.some(w => w.includes('Shelving'))).toBe(true);
  });
});
