"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { deleteMotion } from "../../_actions"

export function DeleteMotionButton({ motionId }: { motionId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this motion? This cannot be undone.")) return
        start(async () => {
          await deleteMotion(motionId)
        })
      }}
    >
      {pending ? "Deleting..." : "Delete"}
    </Button>
  )
}
