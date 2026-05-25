"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function RealtimeSessionSync({ sessionId, status }: { sessionId: string, status: string }) {
  const router = useRouter()

  useEffect(() => {
    if (status === 'analyzed') return // No need to sync if fully done

    const supabase = createClient()
    
    // Listen for any new analyses or fact checks
    const channel = supabase.channel(`sync-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analyses', filter: `session_id=eq.${sessionId}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ballots', filter: `session_id=eq.${sessionId}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'debate_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status === 'analyzed') {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, status, router])

  return null
}
