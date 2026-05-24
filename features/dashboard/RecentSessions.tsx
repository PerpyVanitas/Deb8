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
    <div className="w-full">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {sessions && sessions.length > 0 ? (
          sessions.map((s: any) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block break-inside-avoid"
            >
              <div className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/50">
                <div className="space-y-1.5 mb-4">
                  <h3 className="font-semibold leading-tight tracking-tight line-clamp-3 group-hover:text-primary transition-colors">
                    {s.motions?.text ?? "Untitled motion"}
                  </h3>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                      {s.role || "Speaker"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground break-inside-avoid">No sessions yet.</p>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6 w-full">
          <Button 
            variant="outline" 
            onClick={loadMore} 
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground rounded-full px-8"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load older sessions
          </Button>
        </div>
      )}
    </div>
  )
}
