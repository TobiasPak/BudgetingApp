export interface Paycheck {
  id: string
  amount: number
  // ISO date string ("YYYY-MM-DD") — kept as a plain string rather than a
  // Date object since Zustand state should stay JSON-serializable for when
  // this eventually syncs to Firestore.
  date: string
}
