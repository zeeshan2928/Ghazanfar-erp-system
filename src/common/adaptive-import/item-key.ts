// The key that ties a sale to its purchase cost: the full item name, lowercased
// with whitespace collapsed. Both uploaded datasets name the same product
// identically ("1018 Panasonic Blender 7020 Copper" appears verbatim in each),
// so the name is the only sound identity.
//
// The leading number is NOT an identity. It is a shelf/category code: "176"
// alone covers 48 different purchase items priced Rs 2,175 to Rs 41,800 (and an
// iron), so keying on it costs a product against an unrelated one.
//
// This MUST stay identical to the SQL used to backfill and to resolve cost:
//   lower(btrim(regexp_replace("itemRaw", '\s+', ' ', 'g')))
export function normalizeItemKey(itemRaw: string | null | undefined): string | null {
  if (!itemRaw) return null;
  const key = itemRaw.replace(/\s+/g, ' ').trim().toLowerCase();
  return key.length > 0 ? key : null;
}
