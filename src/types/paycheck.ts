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
}
