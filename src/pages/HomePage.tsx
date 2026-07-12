import { useState } from 'react'
import { MoneySummaryRow } from '@/components/dashboard/MoneySummaryRow'
import { LoadDemoDataButton } from '@/components/dashboard/LoadDemoDataButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpendingContent } from '@/components/spending/SpendingContent'
import { BudgetContent } from '@/components/budget/BudgetContent'
import { IncomeContent } from '@/components/income/IncomeContent'

type DashboardTab = 'spending' | 'budget' | 'income'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('spending')

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">ClearBooks</h1>
        <div className="flex items-center gap-2">
          <LoadDemoDataButton />
          <SignOutButton />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DashboardTab)}
      >
        <MoneySummaryRow />

        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>

        <TabsContent value="spending" className="flex flex-col gap-6">
          <SpendingContent />
        </TabsContent>
        <TabsContent value="budget" className="flex flex-col gap-6">
          <BudgetContent />
        </TabsContent>
        <TabsContent value="income" className="flex flex-col gap-6">
          <IncomeContent />
        </TabsContent>
      </Tabs>
    </main>
  )
}
