"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function AnalysisLoader({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("Initializing AI Coach...")
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    
    const runAnalysis = async () => {
      try {
        setStatus("Analyzing logic, structure, and rhetoric...")
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        })

        if (!res.ok) {
          throw new Error(await res.text())
        }

        if (mounted) {
          setStatus("Analysis complete!")
          router.refresh() // Reload page to fetch from DB
        }
      } catch (err: any) {
        console.error(err)
        if (mounted) setError(err.message || "Failed to analyze speech")
      }
    }

    runAnalysis()
    return () => { mounted = false }
  }, [sessionId, router])

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
        Gemini 2.0 Flash is currently evaluating your performance based on elite competitive debate standards.
      </p>
    </div>
  )
}
