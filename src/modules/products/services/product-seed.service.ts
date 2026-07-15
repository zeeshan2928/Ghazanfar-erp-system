import { Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '@database/prisma.service';
import { scoreClassification } from './product-classification.util';

// Must stay byte-identical to normalizeItemKey in
// src/modules/sales-analysis (or wherever item-key.ts lives) - this is the
// ONLY sound identity across the inventory report, sales file, and purchase
// file. The leading number ("176") is a shelf code, not a product id - it
// spans dozens of unrelated items - so it is never used as a join key.
function normalizeItemKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  return key.length > 0 ? key : null;
}

interface CombinedItem {
  itemKey: string;
  name: string;
  category: string | null;
  brand: string | null;
  stockOnHand: number;
  salePrice: number;
  costPrice: number;
  soldAtLeastOnce: boolean;
  purchasedAtPositivePrice: boolean;
  confirmedPart: boolean;
}

export type SeedDecisionBucket =
  | 'FINISHED_GOOD' // sold + purchased at a price
  | 'ASSEMBLED_GOOD' // sold, never purchased at a price - "you build it"
  | 'RAW_MATERIAL_CONFIRMED' // already in AssemblyPart or Parts Review
  | 'RAW_MATERIAL_SUGGESTED' // bought-only, scored as a likely part
  | 'PRODUCT_SUGGESTED' // bought-only, scored as a likely finished good
  | 'NEEDS_REVIEW'; // bought-only, genuinely ambiguous

export interface SeedDecision {
  item: CombinedItem;
  bucket: SeedDecisionBucket;
  productType: 'RAW_MATERIAL' | 'SERVICE' | 'FINISHED_GOOD' | 'ASSEMBLED_GOOD';
  needsClassificationReview: boolean;
  isActive: boolean;
  score?: number;
  reasons?: string[];
}

export interface SeedSummary {
  totalConsidered: number;
  totalExcludedDiscontinued: number;
  counts: Record<SeedDecisionBucket, number>;
  sample: Record<SeedDecisionBucket, { itemKey: string; name: string }[]>;
}

const SAMPLE_SIZE = 8;

@Injectable()
export class ProductSeedService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Parse the inventory xlsx: "Product Name | Category | Sale Price |
  // Remaining Units | Purchase Price", title row 0, header row 1, data
  // from row 2.
  // ---------------------------------------------------------------------
  private parseInventoryFile(buffer: Buffer): Map<string, { name: string; category: string | null; salePrice: number; stockOnHand: number; purchasePrice: number }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    const result = new Map<string, { name: string; category: string | null; salePrice: number; stockOnHand: number; purchasePrice: number }>();
    const toNumber = (v: any) => Number(String(v ?? '').replace(/,/g, '')) || 0;

    for (const row of grid.slice(2)) {
      const name = String(row[0] ?? '').trim();
      if (!name) continue;
      const key = normalizeItemKey(name);
      if (!key) continue;

      result.set(key, {
        name,
        category: String(row[1] ?? '').trim() || null,
        salePrice: toNumber(row[2]),
        stockOnHand: toNumber(row[3]),
        purchasePrice: toNumber(row[4]),
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------
  // Build the combined, evidenced record for every item that appears in ANY
  // of the three sources, joined on the normalized item name.
  // ---------------------------------------------------------------------
  private async buildCombinedItems(organizationId: number, inventoryBuffer: Buffer): Promise<CombinedItem[]> {
    const inventory = this.parseInventoryFile(inventoryBuffer);

    const [salesLatest, purchaseAgg, assemblyParts, confirmedParts] = await Promise.all([
      // Latest non-duplicate sale per item - gives us a representative name/category/brand/price.
      this.prisma.salesAnalysisRecord.findMany({
        where: { organizationId, itemKey: { not: null }, isDuplicate: false },
        distinct: ['itemKey'],
        orderBy: { transactionDate: 'desc' },
        select: { itemKey: true, itemRaw: true, category: true, brand: true, soldPrice: true },
      }),
      // MAX purchase price ever, per item - this is what "purchased at a
      // price > 0" actually means; the LATEST purchase could be 0 (an
      // ASSEMBLED_GOOD import artifact) while an earlier one was real.
      this.prisma.purchaseAnalysisRecord.groupBy({
        by: ['itemKey'],
        where: { organizationId, itemKey: { not: null }, isDuplicate: false },
        _max: { purchasePrice: true },
      }),
      this.prisma.assemblyPart.findMany({ where: { organizationId }, select: { name: true } }),
      this.prisma.salesItemClassification.findMany({
        where: { organizationId, kind: 'PART' },
        select: { itemName: true },
      }),
    ]);

    // A representative name for bought-only items (no inventory row, never sold).
    const purchaseLatestName = await this.prisma.purchaseAnalysisRecord.findMany({
      where: { organizationId, itemKey: { not: null }, isDuplicate: false },
      distinct: ['itemKey'],
      orderBy: { transactionDate: 'desc' },
      select: { itemKey: true, itemRaw: true },
    });

    const soldKeys = new Set<string>();
    const salesInfo = new Map<string, { name: string; category: string | null; brand: string | null; salePrice: number }>();
    for (const row of salesLatest) {
      if (!row.itemKey) continue;
      soldKeys.add(row.itemKey);
      salesInfo.set(row.itemKey, {
        name: row.itemRaw,
        category: row.category,
        brand: row.brand,
        salePrice: Number(row.soldPrice),
      });
    }

    const purchasePositiveKeys = new Set<string>();
    const purchaseCost = new Map<string, number>();
    for (const row of purchaseAgg) {
      if (!row.itemKey) continue;
      const max = Number(row._max.purchasePrice ?? 0);
      if (max > 0) {
        purchasePositiveKeys.add(row.itemKey);
        purchaseCost.set(row.itemKey, max);
      }
    }

    const purchaseName = new Map<string, string>();
    for (const row of purchaseLatestName) {
      if (row.itemKey) purchaseName.set(row.itemKey, row.itemRaw);
    }

    // Confirmed-part signals: classification is keyed by raw item NAME
    // (matches PartsClassificationService.saveClassifications), so map it
    // through the sales itemRaw->itemKey we already have. Also match against
    // the existing AssemblyPart catalog by normalized name.
    const confirmedPartKeys = new Set<string>();
    const confirmedNames = new Set(confirmedParts.map(c => c.itemName));
    for (const row of salesLatest) {
      if (row.itemKey && confirmedNames.has(row.itemRaw)) confirmedPartKeys.add(row.itemKey);
    }
    for (const part of assemblyParts) {
      const key = normalizeItemKey(part.name);
      if (key) confirmedPartKeys.add(key);
    }

    const allKeys = new Set<string>([...inventory.keys(), ...soldKeys, ...purchasePositiveKeys]);

    const items: CombinedItem[] = [];
    for (const key of allKeys) {
      const inv = inventory.get(key);
      const sale = salesInfo.get(key);
      const sold = soldKeys.has(key);
      const boughtPositive = purchasePositiveKeys.has(key);
      const stockOnHand = inv?.stockOnHand ?? 0;

      // The user's rule: only load items transacted at least once, UNLESS
      // it's discontinued but still has real stock sitting in the godam -
      // dropping that silently would lose track of real inventory.
      if (!sold && !boughtPositive && stockOnHand <= 0) continue;

      items.push({
        itemKey: key,
        name: inv?.name ?? sale?.name ?? purchaseName.get(key) ?? key,
        category: inv?.category ?? sale?.category ?? null,
        brand: sale?.brand ?? null,
        stockOnHand,
        salePrice: inv?.salePrice ?? sale?.salePrice ?? 0,
        costPrice: inv?.purchasePrice && inv.purchasePrice > 0 ? inv.purchasePrice : (purchaseCost.get(key) ?? 0),
        soldAtLeastOnce: sold,
        purchasedAtPositivePrice: boughtPositive,
        confirmedPart: confirmedPartKeys.has(key),
      });
    }

    return items;
  }

  private decide(item: CombinedItem): SeedDecision {
    const isActive = item.soldAtLeastOnce || item.purchasedAtPositivePrice;

    if (item.confirmedPart) {
      return { item, bucket: 'RAW_MATERIAL_CONFIRMED', productType: 'RAW_MATERIAL', needsClassificationReview: false, isActive };
    }
    if (item.soldAtLeastOnce && !item.purchasedAtPositivePrice) {
      // Matches assembled_models_cost_from_bom: appears in the purchase file
      // only at price 0 (or not at all) because there is no real purchase to
      // cost it against - you made it, you didn't buy it.
      return { item, bucket: 'ASSEMBLED_GOOD', productType: 'ASSEMBLED_GOOD', needsClassificationReview: false, isActive };
    }
    if (item.soldAtLeastOnce && item.purchasedAtPositivePrice) {
      return { item, bucket: 'FINISHED_GOOD', productType: 'FINISHED_GOOD', needsClassificationReview: false, isActive };
    }

    // Never sold. Either bought-only, or discontinued-with-stock. Genuinely
    // ambiguous per the data (verified: this bucket mixes real parts like
    // "hot plate glass" with unsold finished goods like "213 deuron heavy
    // iron") - score it, never silently assume.
    const { score, reasons, suggestion } = scoreClassification({
      category: item.category,
      stockOnHand: item.stockOnHand,
      salePrice: item.salePrice,
      soldAtLeastOnce: item.soldAtLeastOnce,
      purchasedAtPositivePrice: item.purchasedAtPositivePrice,
      name: item.name,
    });

    if (suggestion === 'PART') {
      return { item, bucket: 'RAW_MATERIAL_SUGGESTED', productType: 'RAW_MATERIAL', needsClassificationReview: true, isActive, score, reasons };
    }
    if (suggestion === 'PRODUCT') {
      // Confident guess, low risk if wrong (a mislabeled finished good just
      // sits in the catalog; it can't wrongly deduct stock the way a
      // mislabeled part could) - auto-approved, no review needed.
      return { item, bucket: 'PRODUCT_SUGGESTED', productType: 'FINISHED_GOOD', needsClassificationReview: false, isActive, score, reasons };
    }
    // Genuinely ambiguous. Kept as FINISHED_GOOD (the safe default) but
    // flagged - this is deliberately the SAME productType as the confident
    // PRODUCT_SUGGESTED case above; what distinguishes them in the review
    // queue is needsClassificationReview, not productType.
    return { item, bucket: 'NEEDS_REVIEW', productType: 'FINISHED_GOOD', needsClassificationReview: true, isActive, score, reasons };
  }

  async analyze(organizationId: number, inventoryBuffer: Buffer): Promise<SeedSummary> {
    const items = await this.buildCombinedItems(organizationId, inventoryBuffer);
    const decisions = items.map(i => this.decide(i));

    const buckets: SeedDecisionBucket[] = [
      'FINISHED_GOOD', 'ASSEMBLED_GOOD', 'RAW_MATERIAL_CONFIRMED',
      'RAW_MATERIAL_SUGGESTED', 'PRODUCT_SUGGESTED', 'NEEDS_REVIEW',
    ];
    const counts = Object.fromEntries(buckets.map(b => [b, 0])) as Record<SeedDecisionBucket, number>;
    const sample = Object.fromEntries(buckets.map(b => [b, []])) as Record<SeedDecisionBucket, { itemKey: string; name: string }[]>;

    for (const d of decisions) {
      counts[d.bucket]++;
      if (sample[d.bucket].length < SAMPLE_SIZE) {
        sample[d.bucket].push({ itemKey: d.item.itemKey, name: d.item.name });
      }
    }

    return { totalConsidered: decisions.length, totalExcludedDiscontinued: 0, counts, sample };
  }

  // Idempotent: upserts on (organizationId, code=itemKey). Re-running with
  // the same or an updated file corrects existing rows rather than
  // duplicating them.
  async commit(organizationId: number, inventoryBuffer: Buffer): Promise<SeedSummary & { productsWritten: number }> {
    const items = await this.buildCombinedItems(organizationId, inventoryBuffer);
    const decisions = items.map(i => this.decide(i));

    const categoryNames = new Set(decisions.map(d => d.item.category).filter((c): c is string => !!c));
    const categoryIdByName = new Map<string, number>();
    for (const name of categoryNames) {
      const cat = await this.prisma.productCategory.upsert({
        where: { organizationId_name: { organizationId, name } },
        create: { organizationId, name },
        update: {},
      });
      categoryIdByName.set(name, cat.id);
    }

    const brandNames = new Set(decisions.map(d => d.item.brand).filter((b): b is string => !!b));
    const brandIdByName = new Map<string, number>();
    for (const name of brandNames) {
      const brand = await this.prisma.brand.upsert({
        where: { organizationId_name: { organizationId, name } },
        create: { organizationId, name },
        update: {},
      });
      brandIdByName.set(name, brand.id);
    }

    // Chunked, not one giant transaction: 2,000+ independent upserts don't
    // need all-or-nothing atomicity with each other, and a single
    // multi-thousand-statement transaction risks exceeding connection/lock
    // limits for no real benefit here.
    const CHUNK = 25;
    let written = 0;
    for (let i = 0; i < decisions.length; i += CHUNK) {
      const chunk = decisions.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(d =>
          this.prisma.product.upsert({
            where: { organizationId_code: { organizationId, code: d.item.itemKey } },
            create: {
              organizationId,
              code: d.item.itemKey,
              name: d.item.name,
              categoryId: d.item.category ? categoryIdByName.get(d.item.category) : undefined,
              brandId: d.item.brand ? brandIdByName.get(d.item.brand) : undefined,
              cost_price: String(d.item.costPrice),
              productType: d.productType,
              needsClassificationReview: d.needsClassificationReview,
              isActive: d.isActive,
            },
            // productType and needsClassificationReview are deliberately
            // NOT set here. Re-running the seed (e.g. a newer inventory
            // file) must never overwrite a classification a human already
            // confirmed via the review queue - only a brand-new product
            // gets the seeder's best-guess type at all.
            update: {
              name: d.item.name,
              categoryId: d.item.category ? categoryIdByName.get(d.item.category) : undefined,
              brandId: d.item.brand ? brandIdByName.get(d.item.brand) : undefined,
              cost_price: String(d.item.costPrice),
              isActive: d.isActive,
            },
          }),
        ),
      );
      written += chunk.length;
    }

    const summary = await this.analyze(organizationId, inventoryBuffer);
    return { ...summary, productsWritten: written };
  }

  // ---------------------------------------------------------------------
  // REVIEW QUEUE. The bucket a row lands in is fully determined by two
  // already-stored fields - no separate score needs to be persisted:
  //   needsClassificationReview=true AND productType=RAW_MATERIAL  -> confident
  //     "this looks like a part" guess; bulk-confirmable in one action.
  //   needsClassificationReview=true AND productType=FINISHED_GOOD -> genuinely
  //     ambiguous; needs one-by-one human judgment.
  // ---------------------------------------------------------------------
  async getReviewQueue(organizationId: number) {
    const items = await this.prisma.product.findMany({
      where: { organizationId, needsClassificationReview: true },
      select: {
        id: true, code: true, name: true, productType: true, cost_price: true,
        category: { select: { name: true } },
      },
      orderBy: [{ productType: 'asc' }, { name: 'asc' }],
    });

    return items.map(p => ({
      productId: p.id,
      code: p.code,
      name: p.name,
      category: p.category?.name ?? null,
      costPrice: Number(p.cost_price),
      suggestedKind: p.productType === 'RAW_MATERIAL' ? ('PART' as const) : ('PRODUCT' as const),
      bulkConfirmable: p.productType === 'RAW_MATERIAL',
    }));
  }

  // Confirming PART also writes through to SalesItemClassification, keeping
  // the existing sales-pollution filter (parts-classification.service.ts,
  // which reads that table independently) in sync automatically.
  async confirmClassification(organizationId: number, productId: number, kind: 'PART' | 'PRODUCT') {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organizationId } });
    if (!product) throw new NotFoundException('Product not found');

    const productType = kind === 'PART' ? 'RAW_MATERIAL' : 'FINISHED_GOOD';
    await this.prisma.product.update({
      where: { id: productId },
      data: { productType, needsClassificationReview: false },
    });

    if (kind === 'PART') {
      await this.prisma.salesItemClassification.upsert({
        where: { organizationId_itemName: { organizationId, itemName: product.name } },
        create: { organizationId, itemName: product.name, kind: 'PART' },
        update: { kind: 'PART' },
      });
    }

    return { success: true };
  }

  async bulkConfirmParts(organizationId: number, productIds: number[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId },
      select: { id: true, name: true },
    });
    if (products.length === 0) return { confirmed: 0 };

    await this.prisma.product.updateMany({
      where: { id: { in: products.map(p => p.id) }, organizationId },
      data: { productType: 'RAW_MATERIAL', needsClassificationReview: false },
    });

    for (const p of products) {
      await this.prisma.salesItemClassification.upsert({
        where: { organizationId_itemName: { organizationId, itemName: p.name } },
        create: { organizationId, itemName: p.name, kind: 'PART' },
        update: { kind: 'PART' },
      });
    }

    return { confirmed: products.length };
  }
}
