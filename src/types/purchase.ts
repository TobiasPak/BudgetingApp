export interface Purchase {
  id: string
  categoryId: string
  // ISO date string ("YYYY-MM-DD") — see Paycheck for why this stays a
  // plain string rather than a Date object.
  date: string
  description: string
  amount: number
}
