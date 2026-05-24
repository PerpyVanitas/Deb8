"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { getRecentSessions } from "@/app/dashboard/actions"

export function RecentSessions({ initialSessions, userId }: { initialSessions: any[], userId: string }) {
  const [sessions, setSessions] = useState(initialSessions)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(initialSessions.length === 5)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = async () => {
    setIsLoading(true)
    const nextPage = page + 1
    const newSessions = await getRecentSessions(userId, nextPage, 5)
    
    setSessions(prev => [...prev, ...newSessions])
    setPage(nextPage)
    setHasMore(newSessions.length === 5)
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions && sessions.length > 0 ? (
        sessions.map((s: any) => (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="truncate">{s.motions?.text ?? "Untitled motion"}</span>
            <span className="text-xs text-muted-foreground">{s.role}</span>
          </Link>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      )}

      {hasMore && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadMore} 
          disabled={isLoading}
          className="mt-2 text-muted-foreground"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Load older sessions
        </Button>
      )}
    </div>
  )
}
