import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '@database/prisma.service';
import { BomsService, BomView } from './boms.service';
import { CreateBomDto } from '../dto/bom.dto';

// Recipe CSV shape is NOT a transaction row (no date, bill number, or price),
// so it doesn't fit AdaptiveImportService's CanonicalRow/FIELD_SETS - those
// are tightly coupled to the sales/purchase shape and shared by two working
// modules. This is a dedicated, small parser instead. It reuses the same
// PATTERN as that engine (xlsx read, MULTI_ROW carry-forward, analyze/commit
// dry-run) and delegates every actual recipe write to BomsService.create(),
// so cycle detection and validation are never duplicated.
//
// Expected shape (blank Product/Recipe cells carry forward from the row above
// - a 40-part microwave recipe is 40 rows, only the first naming the product):
//
//   Product | Recipe          | Slot   | Component        | Qty
//   1218    | Panasonic 3in1  | Motor  | Motor 7025C      | 1
//           |                 | Body   | White Body       | 1

const HEADER_SYNONYMS = {
  productCode: ['product', 'product code', 'output product', 'output product code', 'makes'],
  recipeName: ['recipe', 'recipe name', 'bom', 'bom name'],
  slotName: ['slot', 'slot name', 'role'],
  componentCode: ['component', 'component code', 'part', 'part code'],
  quantity: ['qty', 'quantity'],
};

type FieldKey = keyof typeof HEADER_SYNONYMS;

interface ParsedLine {
  rowNumber: number; // 1-based, for error messages
  productCode: string;
  recipeName: string;
  slotName: string;
  componentCode: string;
  quantity: number;
}

interface RecipeGroup {
  productCode: string;
  recipeName: string;
  lines: ParsedLine[];
}

export interface BomImportRowError {
  rowNumber: number;
  reason: string;
}

export interface BomImportPreviewRecipe {
  productCode: string;
  productName: string | null;
  recipeName: string;
  lineCount: number;
  slots: string[];
}

export interface BomImportAnalysis {
  recipesFound: number;
  validRecipes: BomImportPreviewRecipe[];
  errors: BomImportRowError[];
}

export interface BomImportCommitResult {
  created: { productCode: string; recipeName: string; bomId: number }[];
  skipped: { productCode: string; recipeName: string; reason: string }[];
  errors: BomImportRowError[];
}

function normalizeHeader(h: string): string {
  return String(h ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

@Injectable()
export class BomImportService {
  constructor(
    private prisma: PrismaService,
    private bomsService: BomsService,
  ) {}

  private detectColumns(headerRow: any[]): Partial<Record<FieldKey, number>> {
    const mapping: Partial<Record<FieldKey, number>> = {};
    headerRow.forEach((cell, index) => {
      const normalized = normalizeHeader(cell);
      for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS) as [FieldKey, string[]][]) {
        if (mapping[field] !== undefined) continue;
        if (synonyms.includes(normalized)) mapping[field] = index;
      }
    });
    return mapping;
  }

  // Parses the buffer into per-line records with carry-forward applied. Does
  // NOT touch the database - no product resolution, no writes.
  private parseRows(buffer: Buffer): { lines: ParsedLine[]; headerErrors: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    if (grid.length === 0) return { lines: [], headerErrors: ['File is empty'] };

    const mapping = this.detectColumns(grid[0]);
    const required: FieldKey[] = ['productCode', 'recipeName', 'slotName', 'componentCode', 'quantity'];
    const missing = required.filter(f => mapping[f] === undefined);
    if (missing.length) {
      return { lines: [], headerErrors: [`Missing required column(s): ${missing.join(', ')}`] };
    }

    const lines: ParsedLine[] = [];
    let lastProductCode = '';
    let lastRecipeName = '';

    for (let i = 1; i < grid.length; i++) {
      const row = grid[i];
      const rowNumber = i + 1; // 1-based, matches what a user sees in Excel

      const productCode = String(row[mapping.productCode!] ?? '').trim() || lastProductCode;
      const recipeName = String(row[mapping.recipeName!] ?? '').trim() || lastRecipeName;
      const slotName = String(row[mapping.slotName!] ?? '').trim();
      const componentCode = String(row[mapping.componentCode!] ?? '').trim();
      const quantityRaw = String(row[mapping.quantity!] ?? '').trim();

      // A fully blank row (common trailing spreadsheet artifact) - skip silently.
      if (!productCode && !recipeName && !slotName && !componentCode && !quantityRaw) continue;

      lastProductCode = productCode;
      lastRecipeName = recipeName;

      const quantity = Number(quantityRaw.replace(/,/g, ''));

      lines.push({ rowNumber, productCode, recipeName, slotName, componentCode, quantity });
    }

    return { lines, headerErrors: [] };
  }

  // Groups by carry-forward (productCode, recipeName) FIRST, then validates
  // each line WITHIN its group. If any single line in a recipe is broken (a
  // typo'd quantity, a blank slot), the WHOLE recipe is rejected rather than
  // silently created with that one component missing - a recipe missing a
  // part it should have is a worse, quieter bug than not creating it at all.
  private groupAndValidate(lines: ParsedLine[]): { groups: RecipeGroup[]; errors: BomImportRowError[] } {
    const errors: BomImportRowError[] = [];
    const rawGroups = new Map<string, RecipeGroup>();

    for (const line of lines) {
      // Product/recipe identity comes from carry-forward, so it can only be
      // blank if the FIRST row of the file never set it - too broken to group.
      if (!line.productCode || !line.recipeName) {
        errors.push({ rowNumber: line.rowNumber, reason: 'No Product/Recipe established yet (first row must set them)' });
        continue;
      }
      const key = `${line.productCode}::${line.recipeName}`;
      const group = rawGroups.get(key) ?? { productCode: line.productCode, recipeName: line.recipeName, lines: [] };
      group.lines.push(line);
      rawGroups.set(key, group);
    }

    const groups: RecipeGroup[] = [];
    for (const group of rawGroups.values()) {
      const groupErrors: BomImportRowError[] = [];
      for (const line of group.lines) {
        if (!line.slotName) groupErrors.push({ rowNumber: line.rowNumber, reason: 'Missing Slot name' });
        if (!line.componentCode) groupErrors.push({ rowNumber: line.rowNumber, reason: 'Missing Component code' });
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
          groupErrors.push({ rowNumber: line.rowNumber, reason: `Invalid quantity "${line.quantity}"` });
        }
      }

      if (groupErrors.length > 0) {
        errors.push(...groupErrors.map(e => ({
          ...e,
          reason: `${e.reason} - the entire recipe "${group.recipeName}" was skipped because of this`,
        })));
        continue;
      }

      groups.push(group);
    }

    return { groups, errors };
  }

  // Resolves every product/component CODE referenced in the file against the
  // real product master. A code that doesn't exist is a row-level error -
  // NEVER auto-created. A wrong link would deduct the wrong part from stock
  // forever once Phase 2 exists.
  private async resolveCodes(organizationId: number, groups: RecipeGroup[]) {
    const allCodes = new Set<string>();
    for (const g of groups) {
      allCodes.add(g.productCode);
      for (const l of g.lines) allCodes.add(l.componentCode);
    }

    const products = await this.prisma.product.findMany({
      where: { organizationId, code: { in: Array.from(allCodes) } },
      select: { id: true, code: true, name: true },
    });
    const byCode = new Map(products.map(p => [p.code, p]));

    return byCode;
  }

  async analyze(organizationId: number, buffer: Buffer): Promise<BomImportAnalysis> {
    const { lines, headerErrors } = this.parseRows(buffer);
    if (headerErrors.length) return { recipesFound: 0, validRecipes: [], errors: headerErrors.map(reason => ({ rowNumber: 1, reason })) };

    const { groups, errors } = this.groupAndValidate(lines);
    const byCode = await this.resolveCodes(organizationId, groups);

    const validRecipes: BomImportPreviewRecipe[] = [];
    for (const group of groups) {
      const product = byCode.get(group.productCode);
      if (!product) {
        for (const l of group.lines) {
          errors.push({ rowNumber: l.rowNumber, reason: `Unknown product code "${group.productCode}" - the entire recipe "${group.recipeName}" was skipped` });
        }
        continue;
      }

      let groupOk = true;
      for (const line of group.lines) {
        if (!byCode.has(line.componentCode)) {
          errors.push({ rowNumber: line.rowNumber, reason: `Unknown component code "${line.componentCode}" - the entire recipe "${group.recipeName}" was skipped because of this` });
          groupOk = false;
        }
      }
      if (!groupOk) continue;

      validRecipes.push({
        productCode: group.productCode,
        productName: product.name,
        recipeName: group.recipeName,
        lineCount: group.lines.length,
        slots: group.lines.map(l => l.slotName),
      });
    }

    return { recipesFound: groups.length, validRecipes, errors };
  }

  async commit(organizationId: number, userId: number, buffer: Buffer): Promise<BomImportCommitResult> {
    const { lines, headerErrors } = this.parseRows(buffer);
    if (headerErrors.length) return { created: [], skipped: [], errors: headerErrors.map(reason => ({ rowNumber: 1, reason })) };

    const { groups, errors } = this.groupAndValidate(lines);
    const byCode = await this.resolveCodes(organizationId, groups);

    const created: BomImportCommitResult['created'] = [];
    const skipped: BomImportCommitResult['skipped'] = [];

    for (const group of groups) {
      const product = byCode.get(group.productCode);
      if (!product) {
        for (const l of group.lines) {
          errors.push({ rowNumber: l.rowNumber, reason: `Unknown product code "${group.productCode}" - the entire recipe "${group.recipeName}" was skipped` });
        }
        continue;
      }

      const unknownComponent = group.lines.find(l => !byCode.has(l.componentCode));
      if (unknownComponent) {
        errors.push({
          rowNumber: unknownComponent.rowNumber,
          reason: `Unknown component code "${unknownComponent.componentCode}" - the entire recipe "${group.recipeName}" was skipped because of this`,
        });
        continue;
      }

      const dto: CreateBomDto = {
        productId: product.id,
        name: group.recipeName,
        lines: group.lines.map(l => ({
          slotName: l.slotName,
          componentProductId: byCode.get(l.componentCode)!.id,
          quantity: l.quantity,
        })),
      };

      // Delegate to the already-verified engine: cycle detection, the
      // duplicate-active-recipe guard, and component-existence checks all
      // happen there - the importer's only job is turning spreadsheet rows
      // into this DTO shape.
      try {
        const bom: BomView = await this.bomsService.create(organizationId, userId, dto);
        created.push({ productCode: group.productCode, recipeName: group.recipeName, bomId: bom.id });
      } catch (e: any) {
        skipped.push({ productCode: group.productCode, recipeName: group.recipeName, reason: e?.message ?? 'Unknown error' });
      }
    }

    return { created, skipped, errors };
  }
}
