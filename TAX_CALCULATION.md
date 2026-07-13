# How ClearBooks calculates tax

This describes the federal + California tax estimate shown on the `/tax`
page (and the dashboard's Tax tab). It's a description of what the code in
`src/lib/tax/` actually does, kept in sync with that code — if you change
the calculation, update this file too.

**This is a personal-budgeting estimate, not tax advice.** It's scoped to
one specific situation (see Assumptions below) and skips real complexity
(itemized deductions, dependents, credits, business expenses). Consult a
tax professional for actual filing.

## Assumptions

- **Single filer.** Hardcoded — no filing-status setting exists yet.
- **Resident alien federal tax status**, not nonresident alien (Form
  1040-NR). This matters: NRAs are generally exempt from self-employment
  tax and can't claim the standard federal deduction. The app assumes
  standard 1040 treatment throughout.
- **Standard deduction only** — no itemizing, no credits (child tax
  credit, education credits, etc.).
- **No W-2 withholding is modeled.** The app doesn't track what your
  employer already withholds from a paycheck, so every number here is the
  *full computed liability*, not "what you still owe on top of
  withholding." For W-2 income, your employer is presumably already
  sending most of this in automatically; for 1099/self-employment income,
  nothing is withheld and the quarterly section (below) is the actionable
  number.
- **Self-employment "net profit" = gross self-employment income logged.**
  The app doesn't track Schedule C business expenses yet, so there's no
  deduction for the cost of doing business — a self-employed person's
  real tax bill would typically be lower than this estimate once expenses
  are factored in.

## Where the numbers come from

Every dollar figure starts from `getAnnualizedIncomeByType`
(`src/lib/income.ts`): it takes the current month's paychecks, splits them
by each income source's tax classification, and projects to a full year
(×12) — the same annualization the rest of the app already uses for
"projected yearly income."

### Income source classification

Every income source (`IncomeSource.incomeType`) is tagged as one of:

| Value | Meaning | Tax treatment |
|---|---|---|
| `w2` | A W-2 job — employer withholds payroll taxes | No self-employment tax; subject to CA SDI |
| `contracted` | A 1099 contractor engagement | Self-employment tax, Schedule C, QBI-eligible |
| `selfEmployed` | Freelance, gig work, or other 1099 income | Same as `contracted` |

`contracted` and `selfEmployed` are taxed **identically** — federal and
California law don't distinguish a 1099 contractor from any other kind of
self-employment income. The two values exist purely so a source can be
labeled more precisely (e.g. "my consulting contract" vs. "Uber driving"),
not because the math differs. `getAnnualizedIncomeByType` combines both
into a single `selfEmployed` total before anything downstream sees it.

An income source with no recognized classification (e.g. a Firestore
document written before this field existed) defaults to `selfEmployed` —
the conservative choice, since treating unclassified income as
self-employment risks overstating tax owed, while treating it as W-2 risks
silently dropping SE tax from the estimate entirely.

## Federal calculation (`src/lib/tax/federal.ts`)

Given annual `w2Income` and `selfEmploymentIncome`:

1. **Self-employment (SE) tax.** Net SE earnings are 92.35% of gross
   self-employment income (`SE_NET_EARNINGS_FACTOR`) — the standard
   statutory adjustment that mirrors the employer-paid half of FICA a
   self-employed person doesn't have.
   - Social Security portion: 12.4% of net SE earnings, capped at the
     Social Security wage base (`SS_WAGE_BASE_2026` = $184,500).
   - Medicare portion: 2.9% of net SE earnings, uncapped.
   - `seTax` = Social Security portion + Medicare portion.
2. **SE tax deduction.** Half of `seTax` is an above-the-line deduction
   (`seTaxDeduction`), reducing AGI — separate from the standard
   deduction.
3. **Additional Medicare tax.** 0.9% on the amount by which (W-2 income +
   net SE earnings) exceeds $200,000 (`ADDITIONAL_MEDICARE_THRESHOLD_SINGLE`,
   single-filer threshold, not inflation-indexed). Matches how IRS Form
   8959 tests this threshold across both income types combined.
4. **AGI** = W-2 income + gross self-employment income − SE tax deduction.
5. **Standard deduction**: $16,100 (`FEDERAL_STANDARD_DEDUCTION_2026`,
   tax year 2026).
6. **QBI (Section 199A) deduction**: 20% of self-employment income,
   capped at 20% of taxable income before QBI (AGI − standard deduction).
   No wage/UBIA phase-out is modeled — that only matters well above the
   ~$197k–201k single-filer threshold.
7. **Taxable income** = (AGI − standard deduction − QBI deduction), floored
   at 0.
8. **Income tax**: progressive marginal brackets applied to taxable
   income (`FEDERAL_BRACKETS_2026` — 10/12/22/24/32/35/37%, tax year 2026).
9. **Total federal tax** = income tax + SE tax + additional Medicare tax.

## California calculation (`src/lib/tax/california.ts`)

California starts from the same AGI concept as federal (including the
SE-tax-deduction adjustment, which CA does conform to), but diverges in
two important ways:

- **No QBI deduction.** California doesn't conform to federal Section
  199A — self-employment income gets no 20% deduction on the CA side.
- **No separate self-employment tax.** Self-employment net income simply
  flows into ordinary CA taxable income; there's no CA equivalent of SE
  tax.

Calculation:

1. Reuses the same SE tax / SE tax deduction math as federal (to compute
   CA AGI), even though CA has no SE tax of its own — the deduction still
   applies to CA AGI.
2. **AGI** = W-2 income + gross self-employment income − SE tax deduction.
3. **Standard deduction**: $5,706 (`CA_STANDARD_DEDUCTION_2025`, the most
   recently confirmed tax year — see note below).
4. **Taxable income** = (AGI − standard deduction), floored at 0. No QBI
   subtraction.
5. **Income tax**: progressive marginal brackets applied to taxable income
   (`CA_BRACKETS_2025` — 1/2/4/6/8/9.3/10.3/11.3/12.3%, tax year 2025).
6. **SDI (State Disability Insurance)**: 1.2% of W-2 wages only
   (`CA_SDI_RATE_2025`), with no wage cap (CA SB 951 removed the cap
   starting 2024). Self-employed income isn't subject to SDI.
7. **Total California tax** = income tax + SDI.

### Why federal and CA use different tax years

Federal uses tax year 2026 (confirmed IRS inflation-adjusted figures were
available). California's 2026 figures found during research were
inconsistent across sources, so 2025 — the most recently confirmed and
consistently-sourced California figures — was used instead. Each bracket
table in `brackets.ts` is labeled with the year it applies to.

## Quarterly estimated payments (`src/lib/tax/quarterly.ts`)

The annual totals above are split into 4 installments with real IRS/FTB
due dates (April 15, June 15, September 15, January 15 of the following
year — not adjusted for weekends/holidays).

**Federal and California split differently:**

| Quarter | Federal | California |
|---|---|---|
| Q1 | 25% | 30% |
| Q2 | 25% | 40% |
| Q3 | 25% | **0%** |
| Q4 | 25% | 30% |

Federal splits evenly. California's FTB installment schedule is genuinely
30/40/0/30 — there is no third-quarter CA payment at all. This is a real,
easy-to-miss FTB rule, not a bug in this app.

## Source data

Every constant in `src/lib/tax/brackets.ts` is commented with its source
and applicable tax year. Summary:

- Federal 2026 brackets/standard deduction: IRS 2026 inflation adjustments
- Self-employment tax rate, Social Security wage base, Additional Medicare
  threshold: IRS / SSA
- QBI deduction: IRC Section 199A
- California 2025 brackets/standard deduction: FTB 540 booklet
- California SDI rate: CA EDD (via SB 951)
- Quarterly installment percentages: FTB Form 540-ES instructions

## What's not modeled

- Filing statuses other than single
- Itemized deductions, credits (child tax credit, education credits, etc.)
- Schedule C business expenses (self-employment income is treated as 100%
  net profit)
- W-2 withholding tracking
- QBI wage/UBIA phase-out for high earners
- Nonresident alien (1040-NR) federal treatment
- A running tax-reserve balance or year-end export

See `CLAUDE.md`'s "Not yet implemented" list for the current state of
these.
