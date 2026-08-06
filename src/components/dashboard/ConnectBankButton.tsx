import { useEffect, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { Landmark, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBudgetStore } from '@/stores/useBudgetStore'
import { createLinkToken, exchangePublicToken, syncTransactions, syncBalance } from '@/lib/plaidServer'

// Real Plaid Link connect flow — see CLAUDE.md for the full design. Branches
// on hasLinkedBank (synced from Firestore, set server-side by plaid-server
// once a Link completes) rather than any local state, since Firestore is
// the one source of truth every other piece of this app already treats it
// as. Renders nothing while signed out.
export function ConnectBankButton() {
  const uid = useAuthStore((state) => state.user?.uid)
  const hasLinkedBank = useBudgetStore((state) => state.hasLinkedBank)

  if (!uid) return null

  return hasLinkedBank ? <SyncNowButton /> : <LinkBankFlow />
}

function SyncNowButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const [{ syncedCount }] = await Promise.all([syncTransactions(), syncBalance()])
      toast.success(`Synced ${syncedCount} transaction${syncedCount === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error("Couldn't sync transactions", {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
      {loading ? 'Syncing…' : 'Sync now'}
    </Button>
  )
}

function LinkBankFlow() {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const { linkToken } = await createLinkToken()
      setLinkToken(linkToken)
    } catch (err) {
      toast.error("Couldn't start bank connection", {
        description: err instanceof Error ? err.message : String(err),
      })
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        <Landmark className="size-4" />
        {loading ? 'Connecting…' : 'Connect a bank'}
      </Button>
      {linkToken && (
        <PlaidLinkLauncher
          linkToken={linkToken}
          onDone={() => {
            setLinkToken(null)
            setLoading(false)
          }}
        />
      )}
    </>
  )
}

// usePlaidLink is a hook, so it must be called unconditionally at a
// component's top level — mounting/unmounting this child (rather than
// calling the hook inline in LinkBankFlow with a possibly-empty token) is
// what lets "fetch the token, then open Link" stay clean.
function PlaidLinkLauncher({ linkToken, onDone }: { linkToken: string; onDone: () => void }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      void handleSuccess(publicToken, metadata)
    },
    onExit: (err) => {
      if (err) {
        toast.error('Bank connection failed', {
          description: err.display_message ?? err.error_message ?? 'Something went wrong.',
        })
      }
      onDone()
    },
  })

  useEffect(() => {
    if (ready) open()
  }, [ready, open])

  async function handleSuccess(publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) {
    if (!publicToken) {
      toast.error("Couldn't finish connecting your bank", {
        description: 'Plaid did not return a token.',
      })
      onDone()
      return
    }
    try {
      await exchangePublicToken(publicToken, metadata.institution?.name ?? undefined)
      const [{ syncedCount }] = await Promise.all([syncTransactions(), syncBalance()])
      toast.success(`Bank connected — synced ${syncedCount} transaction${syncedCount === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error("Couldn't finish connecting your bank", {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      onDone()
    }
  }

  return null
}
