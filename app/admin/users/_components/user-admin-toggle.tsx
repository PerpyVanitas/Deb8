"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toggleUserAdmin } from "../../_actions"

export function UserAdminToggle({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant={isAdmin ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleUserAdmin(userId, !isAdmin)
        })
      }
    >
      {pending ? "Saving..." : isAdmin ? "Revoke admin" : "Make admin"}
    </Button>
  )
}
