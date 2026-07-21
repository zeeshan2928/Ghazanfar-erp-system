/**
 * Canonical docType keys for TransactionSequenceService.
 *
 * These live in ONE place on purpose. Two modules used to generate
 * `GP-{year}-{nnnnnn}` gate-pass numbers independently (bills.service and
 * website-orders.service), each unaware of the other, each computing its own
 * "next" number - so they would eventually hand out the same number twice.
 * Sharing a counter key is what makes that impossible.
 *
 * The rule: two generators that can produce the SAME STRING must use the SAME
 * key. Two generators with genuinely different formats get different keys.
 *
 * Period-scoped numbers (per year, per day) encode the period in the key, so
 * the counter naturally restarts when the period rolls over.
 */
export const DOC_SEQUENCE = {
  /** PO-000005 - not period-scoped, one continuous series. */
  purchaseOrder: (): string => 'PURCHASE_ORDER',

  /** TRF-2026-000006 */
  warehouseTransfer: (year: number): string => `WAREHOUSE_TRANSFER:${year}`,

  /** BILL-2026-000012 (website orders converted to bills) */
  websiteBill: (year: number): string => `WEBSITE_BILL:${year}`,

  /**
   * GP-2026-000004 - the YEAR-scoped gate pass format.
   * Shared by bills.service.ts and website-orders.service.ts: both emit this
   * exact shape, so they MUST draw from this one counter.
   */
  gatePassYearly: (year: number): string => `GATE_PASS_YEARLY:${year}`,

  /**
   * GP-20260714-00001 - the DAY-scoped gate pass format used by
   * gate-passes.service.ts. A genuinely different string shape from the yearly
   * one above (8-digit date vs 4-digit year), so it cannot collide with it and
   * gets its own counter.
   *
   * NOTE: two incompatible gate-pass number formats coexisting in one table is
   * pre-existing weirdness, not something introduced here. Worth unifying, but
   * that is a product decision - it would change numbers users already have.
   */
  gatePassDaily: (yyyymmdd: string): string => `GATE_PASS_DAILY:${yyyymmdd}`,

  /**
   * MO-2026-000001 - the manufacturing order / batch number. A brand-new
   * document type with no legacy history to seed from, so unlike the others
   * above it never needs `getNextCounterSeeded()` - always starts at 1.
   */
  manufacturingOrder: (year: number): string => `MANUFACTURING_ORDER:${year}`,

  /**
   * RCPT-2026-000001 - the auto-generated batch/lot number stamped on each
   * PurchaseOrderReceipt (vendors here don't print lot codes, so each receipt
   * is its own batch). Brand-new, no legacy history to seed - always from 1.
   */
  receiptBatch: (year: number): string => `RECEIPT_BATCH:${year}`,

  /**
   * PR-000005 - purchase returns to a vendor, not period-scoped, one
   * continuous series (same shape as purchaseOrder above). Historical
   * imported returns use a distinct `PR-IMP-NNNNNN` prefix (see the
   * one-off import script that created them) so they never collide with
   * this counter and are excluded from its seed scan by DOC_PATTERN below.
   */
  purchaseReturn: (): string => 'PURCHASE_RETURN',
} as const;

/** Matchers for the one-time seed scan - see TransactionSequenceService.highestSequence. */
export const DOC_PATTERN = {
  purchaseOrder: /^PO-(\d+)$/,
  warehouseTransfer: (year: number): RegExp => new RegExp(`^TRF-${year}-(\\d+)$`),
  websiteBill: (year: number): RegExp => new RegExp(`^BILL-${year}-(\\d+)$`),
  gatePassYearly: (year: number): RegExp => new RegExp(`^GP-${year}-(\\d+)$`),
  gatePassDaily: (yyyymmdd: string): RegExp => new RegExp(`^GP-${yyyymmdd}-(\\d+)$`),
  // Matches only plain PR-000005, never PR-IMP-000005 (the imported rows).
  purchaseReturn: /^PR-(\d+)$/,
} as const;
