// Bootstrap classification scoring for the product seeder.
//
// This is NOT the ground truth. The ground truth is the recipe graph itself
// (BomsService): a product IS a part iff it appears inside a recipe, and IS
// manufactured iff it has one. But at first load there are no recipes yet -
// this scores each item to SUGGEST a type and to sort the human review queue,
// so the bulk of 2,458 products don't all need a manual decision.
//
// A wrong guess here is self-correcting: the moment a product is added to (or
// removed from) a recipe, the recipe overrides whatever this suggested.

export interface ClassificationEvidence {
  category: string | null;
  stockOnHand: number;
  salePrice: number;
  soldAtLeastOnce: boolean;
  purchasedAtPositivePrice: boolean;
  name: string;
}

export interface ClassificationResult {
  score: number;
  reasons: string[];
  suggestion: 'PART' | 'PRODUCT' | 'AMBIGUOUS';
}

// Verified against the user's real inventory report: every one of the 171
// items with stock >= 1000 was unmistakably a part (Bolt Gata, Garari, Gene,
// Blade Jug, Kaim, Nut 7 ML, Wire Blender...). This is the strongest single
// signal, but NOT sufficient alone - the 200-999 band mixes real parts
// (Box 1616 3in1 Juicer) with deeply-stocked finished goods (012 Seco Fan
// Heater, 755 Plastic Kettle), so it must combine with other evidence.
const HIGH_STOCK_THRESHOLD = 1000;
const ELEVATED_STOCK_THRESHOLD = 200;

const PART_CATEGORY_HINTS = ['default', 'box', 'kaim', 'spare parts', 'spare part'];

// Component vocabulary drawn from the BOM parts catalog and the user's own
// examples (Bolt Gata, Garari, Nut 7 ML, Wire Blender Amm, Thermopore Sheet,
// 7025CC Motor, Jali Stainer, Jug Plastic, Kaim 3in1 Juicer...).
const PART_NAME_KEYWORDS = [
  'motor', 'blade', 'wire', 'jug', 'kaim', 'garari', 'gene', 'bolt',
  'thermopore', 'jali', 'button', 'handle', 'sheet', 'nut', 'gata',
  'washer', 'thermostat', 'coli', 'glass jug', 'complete body',
];

const SCORE_PART_THRESHOLD = 5;
const SCORE_PRODUCT_THRESHOLD = -3;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function scoreClassification(evidence: ClassificationEvidence): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];

  if (evidence.stockOnHand >= HIGH_STOCK_THRESHOLD) {
    score += 5;
    reasons.push(`stock on hand is ${evidence.stockOnHand} (>= 1,000 - your rule)`);
  } else if (evidence.stockOnHand >= ELEVATED_STOCK_THRESHOLD) {
    score += 2;
    reasons.push(`stock on hand is ${evidence.stockOnHand} (>= 200)`);
  }

  if (!evidence.soldAtLeastOnce) {
    score += 3;
    reasons.push('never sold in the whole year');
  }

  if (evidence.salePrice <= 0) {
    score += 3;
    reasons.push('sale price is 0 (not sellable as-is)');
  }

  const normalizedCategory = evidence.category ? normalize(evidence.category) : '';
  if (PART_CATEGORY_HINTS.some(hint => normalizedCategory === hint)) {
    score += 2;
    reasons.push(`category is "${evidence.category}"`);
  }

  const normalizedName = normalize(evidence.name);
  const matchedKeyword = PART_NAME_KEYWORDS.find(kw => normalizedName.includes(kw));
  if (matchedKeyword) {
    score += 2;
    reasons.push(`name contains "${matchedKeyword}"`);
  }

  if (evidence.soldAtLeastOnce) {
    score -= 4;
    reasons.push('sold at least once');
  }

  if (evidence.salePrice > 0 && evidence.stockOnHand < ELEVATED_STOCK_THRESHOLD) {
    score -= 2;
    reasons.push('has a sale price and normal stock level');
  }

  let suggestion: ClassificationResult['suggestion'] = 'AMBIGUOUS';
  if (score >= SCORE_PART_THRESHOLD) suggestion = 'PART';
  else if (score <= SCORE_PRODUCT_THRESHOLD) suggestion = 'PRODUCT';

  return { score, reasons, suggestion };
}
