import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'

export function SignOutButton() {
  const signOutUser = useAuthStore((state) => state.signOutUser)

  return (
    <Button variant="outline" size="sm" onClick={() => signOutUser()}>
      <LogOut className="size-4" />
      Sign out
    </Button>
  )
}
