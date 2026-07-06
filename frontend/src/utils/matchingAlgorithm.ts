export interface MatchCandidate {
  entryId: string
  amount: number
  date: string
  confidence: number
  reason: string
}

export const matchingAlgorithm = {
  matchBillToEntry(bill: any, entries: any[]): MatchCandidate[] {
    const candidates: MatchCandidate[] = []

    for (const entry of entries) {
      let confidence = 0
      let reason = ''

      const billDate = new Date(bill.date).getTime()
      const entryDate = new Date(entry.date).getTime()
      const daysDiff = Math.abs(billDate - entryDate) / (1000 * 60 * 60 * 24)
      const amountDiff = Math.abs(bill.amount - entry.amount)

      // Priority 1: Exact amount + exact date
      if (amountDiff < 0.01 && daysDiff === 0) {
        confidence = 100
        reason = 'Exact match (amount & date)'
      }
      // Priority 2: Exact amount + date ±3 days
      else if (amountDiff < 0.01 && daysDiff <= 3) {
        confidence = 90
        reason = `Exact amount, ${daysDiff.toFixed(0)} days difference`
      }
      // Priority 3: Exact amount + date ±7 days
      else if (amountDiff < 0.01 && daysDiff <= 7) {
        confidence = 80
        reason = `Exact amount, ${daysDiff.toFixed(0)} days difference`
      }
      // Priority 4: Reference match
      else if (
        bill.referenceNumber &&
        entry.referenceNumber === bill.referenceNumber
      ) {
        confidence = 70
        reason = 'Reference number match'
      }

      if (confidence > 0) {
        candidates.push({
          entryId: entry.id,
          amount: entry.amount,
          date: entry.date,
          confidence,
          reason,
        })
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence)
  },

  batchMatch(bills: any[], entries: any[]): Array<{ billId: string; entryId: string; confidence: number }> {
    const matches: Array<{ billId: string; entryId: string; confidence: number }> = []
    const usedEntries = new Set<string>()

    for (const bill of bills) {
      const candidates = this.matchBillToEntry(bill, entries)

      for (const candidate of candidates) {
        if (!usedEntries.has(candidate.entryId)) {
          matches.push({
            billId: bill.id,
            entryId: candidate.entryId,
            confidence: candidate.confidence,
          })
          usedEntries.add(candidate.entryId)
          break
        }
      }
    }

    return matches
  },
}
