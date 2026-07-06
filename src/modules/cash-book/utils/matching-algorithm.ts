export interface MatchCandidate {
  id: number;
  amount: number;
  date: Date;
  confidence: number;
  reason: string;
}

export const matchingAlgorithm = {
  matchBillToEntry(bill: any, entries: any[]): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];

    for (const entry of entries) {
      let confidence = 0;
      let reason = '';

      const billDate = new Date(bill.date).getTime();
      const entryDate = new Date(entry.date).getTime();
      const daysDiff = Math.abs(billDate - entryDate) / (1000 * 60 * 60 * 24);
      const amountDiff = Math.abs(bill.amount - entry.amount);

      if (amountDiff < 1 && daysDiff === 0) {
        confidence = 100;
        reason = 'Exact match';
      } else if (amountDiff < 1 && daysDiff <= 3) {
        confidence = 90;
        reason = `Exact amount, ${daysDiff.toFixed(0)}d difference`;
      } else if (amountDiff < 1 && daysDiff <= 7) {
        confidence = 80;
        reason = `Exact amount, ${daysDiff.toFixed(0)}d difference`;
      } else if (bill.referenceNumber && entry.referenceNumber === bill.referenceNumber) {
        confidence = 70;
        reason = 'Reference match';
      }

      if (confidence > 0) {
        candidates.push({
          id: entry.id,
          amount: entry.amount,
          date: entry.date,
          confidence,
          reason,
        });
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  },

  batchMatch(bills: any[], entries: any[]) {
    const matches = [];
    const usedEntries = new Set<number>();

    for (const bill of bills) {
      const candidates = this.matchBillToEntry(bill, entries);

      for (const candidate of candidates) {
        if (!usedEntries.has(candidate.id)) {
          matches.push({
            billId: bill.id,
            entryId: candidate.id,
            confidence: candidate.confidence,
          });
          usedEntries.add(candidate.id);
          break;
        }
      }
    }

    return matches;
  },
};
