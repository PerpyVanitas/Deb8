"use client"

import { useState, useEffect, useRef } from "react"
import { useRecorder } from "./useRecorder"
import { uploadAudio } from "./uploadAudio"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Mic, Square, Loader2, Pause, Play, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { AudioWaveform } from "@/components/ui/audio-waveform"
import { toast } from "sonner"

export function RecordingPanel({ 
  sessionId, 
  userId,
  speakerIndex = 0,
  speakerRole = 'Speaker',
  maxSpeakers = 1,
  timeLimitSeconds = 420
}: { 
  sessionId: string; 
  userId: string;
  speakerIndex?: number;
  speakerRole?: string;
  maxSpeakers?: number;
  timeLimitSeconds?: number;
}) {
  const { status, audioBlob, start, stop, pause, resume, discard, stream, clearAutosave } = useRecorder()
  const [seconds, setSeconds] = useState(0)
  const [isBlindnessMode, setIsBlindnessMode] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= timeLimitSeconds) {
            stop()
            return timeLimitSeconds
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
    // Only upload if we didn't discard (seconds > 0) or we want to allow empty blobs?
    // Discarding sets audioBlob to null, so this won't trigger.
    if (audioBlob && status === 'stopped') {
      handleUploadAndTranscribe(audioBlob)
    }
  }, [audioBlob, status])

  const handleUploadAndTranscribe = async (blob: Blob) => {
    try {
      setIsCompressing(true)
      const { compressWebm } = await import('./compressAudio')
      const compressedBlob = await compressWebm(blob)
      setIsCompressing(false)

      setIsUploading(true)
      const path = await uploadAudio(compressedBlob, userId, sessionId, speakerIndex)
      setIsUploading(false)
      
      setIsTranscribing(true)
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, path, speakerRole, speakerIndex, duration: seconds })
      })
      if (!res.ok) throw new Error("Transcription failed")
      
      setIsTranscribing(false)
      clearAutosave()
      
      // Multi-speaker logic
      if (speakerIndex + 1 < maxSpeakers) {
        // Redirect to next speaker
        router.push(`/sessions/${sessionId}/record?speaker=${speakerIndex + 1}`)
        // Force refresh to clear states if shallow routing doesn't clear component
        router.refresh()
      } else {
        // Navigate to analysis page
        router.push(`/sessions/${sessionId}/analysis`)
      }
    } catch (err: any) {
      console.error(err)
      setIsCompressing(false)
      setIsUploading(false)
      setIsTranscribing(false)
      toast.error("Processing Failed", {
        description: err.message || "An error occurred during compression/upload/transcription.",
      })
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const getProgressValue = () => (seconds / timeLimitSeconds) * 100
  const isWarning = seconds >= timeLimitSeconds - 30 // Warn in the last 30 seconds
  
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="mb-8 relative flex flex-col items-center justify-center gap-4 w-full">
          <div className="w-full flex justify-end absolute -top-4 right-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-xs ${isBlindnessMode ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setIsBlindnessMode(!isBlindnessMode)}
            >
              {isBlindnessMode ? 'Timer Hidden' : 'Hide Timer'}
            </Button>
          </div>
          
          <div className={`text-5xl font-mono tabular-nums transition-all ${isWarning && !isBlindnessMode ? 'text-destructive font-bold' : ''} ${isBlindnessMode ? 'blur-md select-none opacity-50' : ''}`}>
            {isBlindnessMode ? '--:--' : formatTime(seconds)}
          </div>
          <AudioWaveform isRecording={status === 'recording'} stream={stream} className="h-10 gap-1.5" />
        </div>

        {status === 'idle' && (
          <div className="flex flex-col items-center gap-2">
            <Button 
              size="lg" 
              className="rounded-full w-24 h-24 shadow-lg bg-red-500 hover:bg-red-600" 
              onClick={() => { setSeconds(0); start() }}
            >
              <Mic className="w-10 h-10 text-white" />
            </Button>
            <span className="text-sm font-medium mt-2">
              {maxSpeakers > 1 ? `Start ${speakerRole}'s Speech` : 'Start Recording'}
            </span>
          </div>
        )}

        {(status === 'recording' || status === 'paused') && (
          <div className="flex flex-col items-center w-full gap-8">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full w-14 h-14 shadow border-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors" 
                  onClick={() => { setSeconds(0); discard() }}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <span className="text-xs text-muted-foreground">Discard</span>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full w-24 h-24 shadow-lg border-red-500 hover:bg-red-50 text-red-500" 
                  onClick={stop}
                >
                  <Square className="w-10 h-10 fill-current" />
                </Button>
                <span className="text-xs text-red-500 font-medium">Finish</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full w-14 h-14 shadow border-primary text-primary hover:bg-primary/10 transition-colors" 
                  onClick={status === 'paused' ? resume : pause}
                >
                  {status === 'paused' ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                </Button>
                <span className="text-xs text-muted-foreground">{status === 'paused' ? 'Resume' : 'Pause'}</span>
              </div>
            </div>
            
            <div className={`w-full space-y-2 px-6 transition-opacity ${isBlindnessMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <Progress value={getProgressValue()} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>7:00</span>
              </div>
            </div>
          </div>
        )}

        {(isCompressing || isUploading || isTranscribing) && (
          <div className="flex flex-col items-center text-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="font-medium text-lg">
                {isCompressing ? "Compressing audio..." : isUploading ? "Uploading audio..." : "Transcribing speech..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isCompressing ? "Shrinking file size using FFmpeg WebAssembly." : isUploading ? "Saving your speech securely." : "Using Groq Whisper to process text."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
