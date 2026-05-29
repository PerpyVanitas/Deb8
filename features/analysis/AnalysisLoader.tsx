"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Progress } from "@/components/ui/progress"

type PartialAnalysisStatus = {
  speaker_index: number
  speaker_role?: string | null
}

export function AnalysisLoader({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("Initializing AI Coach...")
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)
  const [partialAnalyses, setPartialAnalyses] = useState<PartialAnalysisStatus[]>([])
  const [totalSpeakers, setTotalSpeakers] = useState<number | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const analysisRequested = useRef(false)
  const completionHandled = useRef(false)

  useEffect(() => {
    let mounted = true
    let channel: any

    const completeAndRefresh = () => {
      if (!mounted || completionHandled.current) return
      completionHandled.current = true
      setStatus('Analysis complete!')
      setProgress(100)
      router.refresh()
    }

    const updatePartialProgress = (completed: number, total?: number | null) => {
      if (!mounted) return
      if (typeof total === 'number' && total > 0) {
        const next = Math.min(95, Math.max(10, Math.round((completed / total) * 85 + 10)))
        setProgress(next)
      }
    }

    const refreshPartialResults = async () => {
      try {
        const [analysisRes, transcriptRes, sessionRes] = await Promise.all([
          supabase.from('analyses').select('speaker_index, speaker_role').eq('session_id', sessionId),
          supabase.from('transcripts').select('speaker_index').eq('session_id', sessionId),
          supabase.from('debate_sessions').select('status').eq('id', sessionId).single()
        ])

        if (!mounted) return

        const completed = analysisRes.data || []
        const total = transcriptRes.data?.length ?? null
        const sessionStatus = sessionRes.data?.status

        setPartialAnalyses(completed)
        setTotalSpeakers(total)
        updatePartialProgress(completed.length, total)

        const allSpeakerAnalysesReady = typeof total === 'number' && total > 0 && completed.length >= total

        if (sessionStatus === 'analyzed' || allSpeakerAnalysesReady) {
          completeAndRefresh()
        } else if (completed.length > 0) {
          setStatus(`Partial results available for ${completed.length} speaker(s); continuing analysis on remaining speaker(s)...`)
        } else if (completed.length === 0) {
          setStatus('Analyzing logic, structure, and rhetoric (This may take up to 60 seconds)...')
        }
      } catch (err) {
        console.error('Error fetching partial analysis state', err)
      }
    }

    const subscribeRealtime = async () => {
      channel = supabase
        .channel(`analysis-progress-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'analyses',
            filter: `session_id=eq.${sessionId}`
          },
          () => refreshPartialResults()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'analyses',
            filter: `session_id=eq.${sessionId}`
          },
          () => refreshPartialResults()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'debate_sessions',
            filter: `id=eq.${sessionId}`
          },
          async (payload) => {
            if (payload.new?.status === 'analyzed' && mounted) {
              completeAndRefresh()
            }
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && mounted) {
            await refreshPartialResults()
          }
        })
    }

    const runAnalysis = async () => {
      if (analysisRequested.current) {
        console.log('Analysis request already dispatched for session', sessionId)
        return
      }
      analysisRequested.current = true

      try {
        setStatus('Triggering AI Analysis Pipeline...')
        const harshness = localStorage.getItem('deb8_harshness') || 'Standard'
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, harshness })
        })

        if (!res.ok) {
          throw new Error(await res.text())
        }

        if (mounted) {
          await subscribeRealtime()
          await refreshPartialResults()
        }
      } catch (err: any) {
        console.error(err)
        analysisRequested.current = false
        if (mounted) setError(err.message || 'Failed to analyze speech')
      }
    }

    const intervalId = setInterval(() => {
      setProgress((p) => (p < 95 ? p + 1 : 95))
    }, 600)

    const pollId = setInterval(() => {
      refreshPartialResults()
    }, 5000)

    runAnalysis()

    return () => {
      mounted = false
      clearInterval(intervalId)
      clearInterval(pollId)
      if (channel) {
        supabase.removeChannel(channel)
      }
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
    <div className="space-y-8 py-24 w-full max-w-2xl mx-auto text-center">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">{status}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Gemini 2.0 Flash is evaluating your performance based on elite competitive debate standards in the background queue.
          </p>
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">Processing...</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 w-full" />
      </div>

      {partialAnalyses.length > 0 && (
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-left">
          <p className="text-sm font-semibold text-primary mb-2">Partial analysis available</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {partialAnalyses.map((analysis) => (
              <li key={analysis.speaker_index} className="flex items-center justify-between gap-3">
                <span>
                  Speaker {analysis.speaker_index + 1}
                  {analysis.speaker_role ? ` — ${analysis.speaker_role}` : ''}
                </span>
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">Ready</span>
              </li>
            ))}
          </ul>
          {typeof totalSpeakers === 'number' && (
            <p className="mt-3 text-xs text-muted-foreground">
              {partialAnalyses.length} of {totalSpeakers} speaker analyses available. Refresh will show completed results automatically once the pipeline finishes.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
