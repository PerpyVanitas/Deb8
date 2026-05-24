"use client"

import { useState, useEffect, useRef } from "react"
import { useRecorder } from "./useRecorder"
import { uploadAudio } from "./uploadAudio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Mic, Square, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function RecordingPanel({ sessionId, userId }: { sessionId: string; userId: string }) {
  const { status, audioBlob, start, stop } = useRecorder()
  const [seconds, setSeconds] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 420) { // 7 minutes
            stop()
            return 420
          }
          return s + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, stop])

  useEffect(() => {
    if (audioBlob && status === 'stopped') {
      handleUploadAndTranscribe(audioBlob)
    }
  }, [audioBlob, status])

  const handleUploadAndTranscribe = async (blob: Blob) => {
    try {
      setIsUploading(true)
      const path = await uploadAudio(blob, userId, sessionId)
      setIsUploading(false)
      
      setIsTranscribing(true)
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, path })
      })
      if (!res.ok) throw new Error("Transcription failed")
      
      setIsTranscribing(false)
      // Navigate to analysis page
      router.push(`/sessions/${sessionId}/analysis`)
    } catch (err) {
      console.error(err)
      setIsUploading(false)
      setIsTranscribing(false)
      alert("An error occurred during upload/transcription.")
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getProgressValue = () => (seconds / 420) * 100
  const isWarning = seconds >= 390 // 6:30
  
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="mb-8 relative flex items-center justify-center">
          <div className={`text-5xl font-mono tabular-nums ${isWarning ? 'text-destructive font-bold' : ''}`}>
            {formatTime(seconds)}
          </div>
        </div>

        {status === 'idle' && (
          <Button 
            size="lg" 
            className="rounded-full w-24 h-24 shadow-lg bg-red-500 hover:bg-red-600" 
            onClick={start}
          >
            <Mic className="w-10 h-10 text-white" />
          </Button>
        )}

        {status === 'recording' && (
          <div className="flex flex-col items-center w-full gap-8">
            <Button 
              size="lg" 
              variant="outline"
              className="rounded-full w-24 h-24 shadow-lg border-red-500 hover:bg-red-50 text-red-500" 
              onClick={stop}
            >
              <Square className="w-10 h-10 fill-current" />
            </Button>
            <div className="w-full space-y-2">
              <Progress value={getProgressValue()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>7:00</span>
              </div>
            </div>
          </div>
        )}

        {(isUploading || isTranscribing) && (
          <div className="flex flex-col items-center text-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="font-medium text-lg">
                {isUploading ? "Uploading audio..." : "Transcribing speech..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isUploading ? "Saving your speech securely." : "Using Groq Whisper to process text."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
