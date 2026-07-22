export interface Paycheck {
  id: string
  amount: number
  // ISO date string ("YYYY-MM-DD") — kept as a plain string rather than a
  // Date object since Zustand state should stay JSON-serializable for when
  // this eventually syncs to Firestore.
  date: string
  // References an IncomeSource's id — which income stream this paycheck
  // belongs to (W-2 job, 1099 freelance, a specific gig platform, etc.), so
  // income can be broken down by source the same way spending is broken
  // down by budget category.
  sourceId: string
  // Server-assigned audit timestamps (ISO datetime strings, converted from
  // Firestore Timestamps in src/lib/firestore/sync.ts) — distinct from
  // `date` above, which is the user-entered transaction date, not when the
  // record was actually created/edited. Optional: documents written before
  // this field existed simply don't have one; no synthetic value is
  // fabricated for them.
  createdAt?: string
  updatedAt?: string
}
