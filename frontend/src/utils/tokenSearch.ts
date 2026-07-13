// The universal search rule, frontend half. Must behave identically to the
// backend's src/common/search/token-search.ts - a search bar that filters a
// loaded list must not answer differently from one that queries the server.
//
// A query is split into words, and EVERY word must appear somewhere in the
// record, in ANY order. So
//
//     "176 HS 8600CC Kenwood 3in1 Juicer 7025CC"
//
// is found by "176 ken 7025", by "8600 kenwood", and by "3in1 7025" alike.
// The old `.toLowerCase().includes(query)` needed the whole query to appear as
// one contiguous run of text, so none of those three found anything.
//
// Not just for products: this is the rule everywhere, so "ali 0300" finds the
// customer "Muhammad Ali" on phone "03001234567" just as readily.
//
// Deliberately NOT fuzzy - a word must really be there, just not where you
// typed it. Typo tolerance was considered and declined: it costs precision.

export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** True when every word of `query` appears in at least one of `texts`. */
export function matchesTokens(query: string, ...texts: (string | number | null | undefined)[]): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true; // empty query matches everything
  // Joined with a gap so a token cannot straddle two fields and match by accident.
  const hay = texts
    .filter(t => t !== null && t !== undefined && t !== '')
    .join('   ')
    .toLowerCase();
  return tokens.every(t => hay.includes(t));
}
