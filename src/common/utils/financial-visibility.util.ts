/**
 * Strips cost/price fields from responses for users without canViewFinancials.
 * Used at the service layer (not a guard) for endpoints that must stay usable
 * for their non-financial purpose - e.g. browsing the product catalog or
 * tracking PO receipt progress shouldn't require financial access, but the
 * cost figures embedded in those same responses should still be hidden.
 */

export function stripProductCost<T extends Record<string, any>>(product: T, canView: boolean): T {
  if (canView || !product) return product;
  const clone: any = { ...product };
  delete clone.cost_price;
  delete clone.costPrice;
  return clone;
}

export function stripProductCostList<T extends Record<string, any>>(products: T[], canView: boolean): T[] {
  return canView ? products : products.map((p) => stripProductCost(p, canView));
}

export function stripPOCost<T extends Record<string, any>>(po: T, canView: boolean): T {
  if (canView || !po) return po;
  const clone: any = { ...po };
  delete clone.po_amount;

  if (Array.isArray(clone.PurchaseOrderItem)) {
    clone.PurchaseOrderItem = clone.PurchaseOrderItem.map((item: any) => {
      const { unit_cost, ...rest } = item;
      return rest;
    });
  }

  return clone;
}

export function stripPOCostList<T extends Record<string, any>>(purchaseOrders: T[], canView: boolean): T[] {
  return canView ? purchaseOrders : purchaseOrders.map((po) => stripPOCost(po, canView));
}

export function stripVendorPricing<T extends Record<string, any>>(vendors: T[], canView: boolean): T[] {
  if (canView) return vendors;
  return vendors.map((v) => {
    const clone: any = { ...v };
    delete clone.unitPrice;
    return clone;
  });
}
