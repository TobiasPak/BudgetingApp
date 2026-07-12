import { useState } from 'react'
import { Sparkles } from 'lucide-react'
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
import { loadDemoData } from '@/lib/firestore/demoData'

// Only rendered when the signed-in user's data is genuinely empty (all four
// collections, not just one — a partially-seeded account from an
// interrupted load shouldn't hide this) — the primary safety rail against
// accidentally clobbering real data, on top of the confirm dialog below.
export function LoadDemoDataButton() {
  const [loading, setLoading] = useState(false)
  const uid = useAuthStore((state) => state.user?.uid)
  const categories = useBudgetStore((state) => state.categories)
  const incomeSources = useBudgetStore((state) => state.incomeSources)
  const paychecks = useBudgetStore((state) => state.paychecks)
  const purchases = useBudgetStore((state) => state.purchases)

  const isEmpty =
    categories.length === 0 &&
    incomeSources.length === 0 &&
    paychecks.length === 0 &&
    purchases.length === 0

  if (!isEmpty || !uid) return null

  async function handleConfirm() {
    if (!uid) return
    setLoading(true)
    try {
      await loadDemoData(uid)
    } catch (err) {
      toast.error("Couldn't load demo data", {
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
          <Sparkles className="size-4" />
          Load demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Load demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This adds sample categories, income sources, paychecks, and
            purchases to your account so you can try the app out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? 'Loading…' : 'Load demo data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
