import { TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { getAnnualizedIncomeByType } from '@/lib/income'
import { calculateFederalTax } from '@/lib/tax/federal'
import { calculateCaliforniaTax } from '@/lib/tax/california'
import { getQuarterlyEstimates, formatDueDate } from '@/lib/tax/quarterly'
import { formatCurrency } from '@/lib/utils'

interface LineItemProps {
  label: string
  value: number
  emphasis?: boolean
}

function LineItem({ label, value, emphasis }: LineItemProps) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={emphasis ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={emphasis ? 'font-semibold' : undefined}>
        ${formatCurrency(value)}
      </span>
    </div>
  )
}

// No month/year navigation here, unlike Budget/Spending/Income — tax is an
// annual calculation off annualized current-month income, and there's no
// "which year" picker anywhere in this app to hook into yet. Always
// reflects "now," same as MoneySummaryRow.
export function TaxContent() {
  const paychecks = useBudgetStore((state) => state.paychecks)
  const incomeSources = useBudgetStore((state) => state.incomeSources)

  const { w2, selfEmployed } = getAnnualizedIncomeByType(paychecks, incomeSources)
  const federal = calculateFederalTax({
    w2Income: w2,
    selfEmploymentIncome: selfEmployed,
  })
  const california = calculateCaliforniaTax({
    w2Income: w2,
    selfEmploymentIncome: selfEmployed,
  })
  const totalTax = federal.totalFederalTax + california.totalCaliforniaTax

  const currentYear = new Date().getFullYear()
  const quarters = getQuarterlyEstimates(
    {
      federalTotal: federal.totalFederalTax,
      californiaTotal: california.totalCaliforniaTax,
    },
    currentYear
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-warning" />
        <p className="text-muted-foreground">
          Estimate only, not tax advice. Assumes a single filer, resident
          alien federal tax status, and the standard deduction — no
          itemizing or credits. Federal figures use {currentYear} brackets;
          California figures use the most recently confirmed (2025)
          brackets. Self-employment "net profit" is modeled as gross
          self-employment income logged, since this app doesn't track
          business expenses yet. Doesn't account for any W-2 withholding
          your employer already sends in. Consult a tax professional for
          actual filing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Federal Tax Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${formatCurrency(federal.totalFederalTax)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              California Tax Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              ${formatCurrency(california.totalCaliforniaTax)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${formatCurrency(totalTax)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Federal breakdown</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <LineItem label="W-2 income" value={federal.w2Income} />
            <LineItem
              label="Self-employment income"
              value={federal.selfEmploymentIncome}
            />
            <LineItem label="Self-employment tax" value={federal.seTax} />
            <LineItem
              label="Additional Medicare tax"
              value={federal.additionalMedicareTax}
            />
            <LineItem
              label="Standard deduction"
              value={-federal.standardDeduction}
            />
            <LineItem label="QBI deduction" value={-federal.qbiDeduction} />
            <LineItem label="Taxable income" value={federal.taxableIncome} />
            <LineItem
              label="Total federal tax"
              value={federal.totalFederalTax}
              emphasis
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>California breakdown</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <LineItem label="W-2 income" value={california.w2Income} />
            <LineItem
              label="Self-employment income"
              value={california.selfEmploymentIncome}
            />
            <LineItem label="State Disability Insurance (SDI)" value={california.sdi} />
            <LineItem
              label="Standard deduction"
              value={-california.standardDeduction}
            />
            <LineItem label="Taxable income" value={california.taxableIncome} />
            <LineItem
              label="Total California tax"
              value={california.totalCaliforniaTax}
              emphasis
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quarterly estimated payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Federal splits evenly across all 4 quarters. California doesn't
            — it's 30% / 40% / 0% / 30%, so Q3 is intentionally $0.
          </p>
          <div className="divide-y">
            {quarters.map((quarter) => (
              <div
                key={quarter.label}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{quarter.label}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    due {formatDueDate(quarter.dueDate)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span>Federal ${formatCurrency(quarter.federalAmount)}</span>
                  <span>CA ${formatCurrency(quarter.californiaAmount)}</span>
                  <span className="font-medium">
                    ${formatCurrency(quarter.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
