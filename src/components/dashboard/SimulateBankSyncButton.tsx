import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { simulateBankSync } from '@/lib/firestore/plaidDemoData'

// Stands in for a real Plaid Link + transactions-sync flow until an actual
// developer sandbox account exists (see functions/src/index.ts) — seeds a
// batch of realistic, uncategorized fake bank transactions so the Spending/
// Income "Bank activity" logs and the categorize-in-the-UI flow are
// testable today. Only shown while there's nothing to sync yet (mirrors
// LoadDemoDataButton's "only when genuinely empty" safety rail) — repeat
// clicks would otherwise pile up duplicate fake transactions.
export function SimulateBankSyncButton() {
  const [loading, setLoading] = useState(false)
  const uid = useAuthStore((state) => state.user?.uid)
  const plaidTransactions = useBudgetStore((state) => state.plaidTransactions)

  if (plaidTransactions.length > 0 || !uid) return null

  async function handleConfirm() {
    if (!uid) return
    setLoading(true)
    try {
      await simulateBankSync(uid)
    } catch (err) {
      toast.error("Couldn't simulate bank sync", {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Landmark className="size-4" />
          Simulate bank sync
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Simulate a bank sync?</AlertDialogTitle>
          <AlertDialogDescription>
            Adds a batch of realistic, uncategorized fake transactions to your
            account — standing in for a real Plaid connection, which isn't
            set up yet — so you can try out the bank activity logs and
            categorization flow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? 'Syncing…' : 'Simulate sync'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
