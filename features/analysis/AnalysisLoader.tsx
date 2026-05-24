"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function AnalysisLoader({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("Initializing AI Coach...")
  const [error, setError] = useState("")
  const router = useRouter()
  // Ensure createClient is called outside or safely inside component without recreating infinitely
  // In Next.js App Router, we usually just instantiate it
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let mounted = true
    let channel: any;
    
    const runAnalysis = async () => {
      try {
        setStatus("Triggering AI Analysis Pipeline...")
        const harshness = localStorage.getItem('deb8_harshness') || 'Standard'
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, harshness })
        })

        if (!res.ok) {
          throw new Error(await res.text())
        }

        if (mounted) {
          setStatus("Analyzing logic, structure, and rhetoric (This may take up to 60 seconds)...")
          // Set up realtime subscription
          channel = supabase
            .channel('session-status-changes')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'debate_sessions',
                filter: `id=eq.${sessionId}`,
              },
              (payload) => {
                if (payload.new.status === 'analyzed') {
                  if (mounted) {
                    setStatus("Analysis complete!")
                    router.refresh()
                  }
                }
              }
            )
            .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                // Do one manual check just in case it finished before we subscribed
                const { data } = await supabase.from('debate_sessions').select('status').eq('id', sessionId).single()
                if (data?.status === 'analyzed' && mounted) {
                  setStatus("Analysis complete!")
                  router.refresh()
                }
              }
            })
        }
      } catch (err: any) {
        console.error(err)
        if (mounted) setError(err.message || "Failed to analyze speech")
      }
    }

    runAnalysis()
    
    return () => { 
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [sessionId, router, supabase])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-destructive/10">
        <h2 className="text-xl font-bold text-destructive mb-2">Analysis Failed</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Loader2 className="w-16 h-16 animate-spin text-primary mb-6" />
      <h2 className="text-2xl font-bold tracking-tight mb-2">{status}</h2>
      <p className="text-muted-foreground max-w-md">
        Gemini 2.0 Flash is evaluating your performance based on elite competitive debate standards in the background queue.
      </p>
    </div>
  )
}
