"use client"

import { useState, useEffect } from "react"
import { useRecorder } from "@/features/recording/useRecorder"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Square, Play, RefreshCw, Bot, Send } from "lucide-react"
import { AudioWaveform } from "@/components/ui/audio-waveform"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { useRef } from "react"

export function OpponentArena({ session }: { session: any }) {
  const { status, audioBlob, start, stop, stream } = useRecorder(session.id)
  const [persona, setPersona] = useState("aggressive")
  const [isProcessing, setIsProcessing] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [history, setHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([])
  const [supabase] = useState(() => createClient())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await supabase
        .from('arena_turns')
        .select('role, text')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
      
      if (data && data.length > 0) {
        setHistory(data as { role: 'user' | 'ai', text: string }[])
      }
    }
    loadHistory()
  }, [session.id, supabase])

  useEffect(() => {
    if (status === 'stopped' && audioBlob) {
      handleAudioSubmit(audioBlob)
    }
  }, [status, audioBlob])

  const submitTurn = async (userTranscript: string) => {
    try {
      const newHistory = [...history, { role: 'user' as const, text: userTranscript }]
      setHistory(newHistory)
      await supabase.from('arena_turns').insert({ session_id: session.id, role: 'user', text: userTranscript })

      // Generate AI Opponent Rebuttal
      const opponentRes = await fetch('/api/opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: userTranscript, 
          motion: session.motions?.text || "Free Sparring", 
          persona,
          role: session.role,
          format: session.format
        })
      })
      if (!opponentRes.ok) throw new Error("Opponent generation failed")
      const { rebuttal } = await opponentRes.json()

      setHistory([...newHistory, { role: 'ai', text: rebuttal }])
      await supabase.from('arena_turns').insert({ session_id: session.id, role: 'ai', text: rebuttal })

      speakText(rebuttal)
    } catch (err) {
      console.error(err)
      alert("Failed to process turn. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAudioSubmit = async (blob: Blob) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', blob)
      const transcribeRes = await fetch('/api/transcribe-direct', { method: 'POST', body: formData })
      if (!transcribeRes.ok) throw new Error("Transcription failed")
      const { text: userTranscript } = await transcribeRes.json()

      await submitTurn(userTranscript)
    } catch (err) {
      console.error(err)
      alert("Failed to transcribe audio. Please try again.")
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing) return
    const text = textInput.trim()
    setTextInput("")
    setIsProcessing(true)
    await submitTurn(text)
  }

  const speakText = async (text: string) => {
    // Stop existing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis?.cancel()

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.play()
        return
      }
      throw new Error("TTS API unavailable or failed")
    } catch (err) {
      console.warn("Falling back to Browser TTS", err)
      if (!window.speechSynthesis) return
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.1
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const toggleRecording = () => {
    if (status === 'recording') {
      stop()
    } else {
      if (audioRef.current) audioRef.current.pause()
      window.speechSynthesis?.cancel() // Stop AI talking when user starts
      start()
    }
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Opponent Persona</CardTitle>
          <CardDescription>Select how you want the AI to fight back.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aggressive">Aggressive Debater</SelectItem>
              <SelectItem value="technical">Technical Logician</SelectItem>
              <SelectItem value="persuasive">Persuasive Narrator</SelectItem>
              <SelectItem value="trap_setter">Strategic Trap Setter</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Live Arena</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex justify-center py-6 relative">
            <Button 
              size="lg" 
              variant={status === 'recording' ? 'destructive' : 'default'} 
              className={`rounded-full w-24 h-24 flex flex-col gap-2 shadow-lg transition-all ${status === 'recording' ? 'animate-pulse ring-4 ring-red-500/50' : 'hover:scale-105'}`}
              onClick={toggleRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : status === 'recording' ? (
                <>
                  <Square className="w-8 h-8 fill-current" />
                  <span className="text-xs font-semibold tracking-wider">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8" />
                  <span className="text-xs font-semibold tracking-wider">SPEAK</span>
                </>
              )}
            </Button>
            
            <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center pointer-events-none">
              <AudioWaveform isRecording={status === 'recording'} stream={stream} className="h-16 w-32 opacity-50 absolute -z-10" />
            </div>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {history.length === 0 && (
              <p className="text-center text-muted-foreground text-sm italic py-4">
                Press Speak or type your argument below to start sparring.
              </p>
            )}
            {history.map((turn, i) => (
              <div key={i} className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-muted-foreground mb-1 px-1 uppercase font-semibold tracking-wider">
                  {turn.role === 'user' ? 'You' : 'AI Opponent'}
                </span>
                <div className={`p-4 rounded-lg max-w-[85%] text-sm leading-relaxed shadow-sm ${turn.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none border'}`}>
                  {turn.text}
                </div>
                {turn.role === 'ai' && (
                  <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => speakText(turn.text)}>
                    <Play className="w-3 h-3 mr-1" /> Replay Audio
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Text Sparring Input */}
      <Card>
        <CardContent className="p-4 flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text Sparring Mode</label>
            <Textarea 
              placeholder="Type your rebuttal here..." 
              className="resize-none min-h-[60px]" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isProcessing || status === 'recording'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleTextSubmit()
                }
              }}
            />
          </div>
          <Button 
            className="mb-1"
            disabled={!textInput.trim() || isProcessing || status === 'recording'}
            onClick={handleTextSubmit}
          >
            <Send className="w-4 h-4 mr-2" /> Send
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
