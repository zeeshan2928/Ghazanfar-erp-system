import { tokenize, matchesTokens, tokenSearchWhere, expandMultiWordContains } from './token-search';

// The item from the user's own report - every one of his three queries must find it.
const ITEM = '176 HS 8600CC Kenwood 3in1 Juicer 7025CC';

describe('universal token search rule', () => {
  describe('the queries that used to find nothing', () => {
    it.each([
      ['176 ken 7025', 'out of order, and "ken" is only part of "Kenwood"'],
      ['8600 kenwood', 'out of order'],
      ['3in1 7025', 'a subset of the words, out of order'],
      ['kenwood', 'one word'],
      ['7025cc 176', 'reversed'],
      ['  176   ken  ', 'ragged spacing'],
    ])('finds it: %s (%s)', query => {
      expect(matchesTokens(query, ITEM)).toBe(true);
    });

    it('still refuses a word that is genuinely absent', () => {
      expect(matchesTokens('176 ken philips', ITEM)).toBe(false);
    });

    it('is not fuzzy: a misspelling does not match, by design', () => {
      expect(matchesTokens('kenwod', ITEM)).toBe(false);
    });

    it('an empty query matches everything, so a cleared box shows the full list', () => {
      expect(matchesTokens('', ITEM)).toBe(true);
      expect(matchesTokens('   ', ITEM)).toBe(true);
    });
  });

  describe('the rule is universal - not a product rule', () => {
    it('finds a customer by name and phone at once, in any order', () => {
      expect(matchesTokens('ali 0300', 'Muhammad Ali', '03001234567')).toBe(true);
      expect(matchesTokens('0300 ali', 'Muhammad Ali', '03001234567')).toBe(true);
    });

    it('a token may not straddle two fields', () => {
      // "Ali" ends one field and "03001" starts the next; "ali03001" is not a
      // real token in either, and must not match by accidental adjacency.
      expect(matchesTokens('ali03001', 'Muhammad Ali', '03001234567')).toBe(false);
    });
  });

  describe('tokenize', () => {
    it('splits on any run of whitespace and drops the empties', () => {
      expect(tokenize('  176   ken \t 7025 ')).toEqual(['176', 'ken', '7025']);
      expect(tokenize('   ')).toEqual([]);
    });
  });

  describe('tokenSearchWhere (the Prisma half)', () => {
    it('demands every word, but lets each come from a different field', () => {
      const where = tokenSearchWhere('ali 0300', ['name', 'phone']) as any;
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0].OR).toEqual([
        { name: { contains: 'ali', mode: 'insensitive' } },
        { phone: { contains: 'ali', mode: 'insensitive' } },
      ]);
      expect(where.AND[1].OR[1]).toEqual({ phone: { contains: '0300', mode: 'insensitive' } });
    });

    it('nests a relation path', () => {
      const where = tokenSearchWhere('acme', ['customer.name']) as any;
      expect(where.AND[0].OR[0]).toEqual({
        customer: { name: { contains: 'acme', mode: 'insensitive' } },
      });
    });

    it('returns {} for an empty query, so it can be spread unconditionally', () => {
      expect(tokenSearchWhere('  ', ['name'])).toEqual({});
    });
  });

  describe('expandMultiWordContains (applied to the column-filter services)', () => {
    it('splits a multi-word contains into a where-level AND', () => {
      const out = expandMultiWordContains({
        organizationId: 1,
        name: { contains: '176 ken 7025', mode: 'insensitive' },
      }) as any;

      expect(out.organizationId).toBe(1);
      expect(out.name).toBeUndefined(); // moved into the AND
      expect(out.AND).toEqual([
        { name: { contains: '176', mode: 'insensitive' } },
        { name: { contains: 'ken', mode: 'insensitive' } },
        { name: { contains: '7025', mode: 'insensitive' } },
      ]);
    });

    it('leaves a single-word contains exactly as it was', () => {
      const where = { name: { contains: 'kenwood', mode: 'insensitive' } };
      expect(expandMultiWordContains({ ...where })).toEqual(where);
    });

    it('rebuilds a relation path when splitting', () => {
      const out = expandMultiWordContains({
        brand: { name: { contains: 'st national', mode: 'insensitive' } },
      }) as any;
      expect(out.AND).toEqual([
        { brand: { name: { contains: 'st', mode: 'insensitive' } } },
        { brand: { name: { contains: 'national', mode: 'insensitive' } } },
      ]);
    });

    it('never touches an OR branch - hoisting out of one would change what the query means', () => {
      const where = {
        OR: [{ name: { contains: 'a b', mode: 'insensitive' } }, { code: { equals: 'x' } }],
      };
      expect(expandMultiWordContains({ ...where })).toEqual(where);
    });

    it('keeps other operators intact alongside a split', () => {
      const out = expandMultiWordContains({
        name: { contains: 'red hot', mode: 'insensitive' },
        price: { gte: 100 },
      }) as any;
      expect(out.price).toEqual({ gte: 100 });
      expect(out.AND).toHaveLength(2);
    });
  });
});
