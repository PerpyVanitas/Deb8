"use client"

import { useState, useEffect } from "react"
import { useRecorder } from "@/features/recording/useRecorder"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic, Square, Play, RefreshCw, Bot } from "lucide-react"

export function OpponentArena() {
  const { status, audioBlob, start, stop } = useRecorder()
  const [motion, setMotion] = useState("THW ban all fossil fuel extraction by 2030")
  const [persona, setPersona] = useState("aggressive")
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([])

  useEffect(() => {
    if (status === 'stopped' && audioBlob) {
      handleAudioSubmit(audioBlob)
    }
  }, [status, audioBlob])

  const handleAudioSubmit = async (blob: Blob) => {
    setIsProcessing(true)
    try {
      // 1. Transcribe audio directly
      const formData = new FormData()
      formData.append('file', blob)
      const transcribeRes = await fetch('/api/transcribe-direct', { method: 'POST', body: formData })
      if (!transcribeRes.ok) throw new Error("Transcription failed")
      const { text: userTranscript } = await transcribeRes.json()

      const newHistory = [...history, { role: 'user' as const, text: userTranscript }]
      setHistory(newHistory)

      // 2. Generate AI Opponent Rebuttal
      const opponentRes = await fetch('/api/opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: userTranscript, motion, persona })
      })
      if (!opponentRes.ok) throw new Error("Opponent generation failed")
      const { rebuttal } = await opponentRes.json()

      setHistory([...newHistory, { role: 'ai', text: rebuttal }])

      // 3. Speak the rebuttal using Browser TTS
      speakText(rebuttal)

    } catch (err) {
      console.error(err)
      alert("Failed to process turn. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel() // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const toggleRecording = () => {
    if (status === 'recording') {
      stop()
    } else {
      window.speechSynthesis?.cancel() // Stop AI talking when user starts
      start()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Arena Settings</CardTitle>
          <CardDescription>Configure your debate scenario before engaging.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motion">Debate Motion</Label>
            <Input id="motion" value={motion} onChange={e => setMotion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>AI Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggressive">Aggressive BP Debater</SelectItem>
                <SelectItem value="technical">Technical Logician</SelectItem>
                <SelectItem value="persuasive">Persuasive Narrative Debater</SelectItem>
                <SelectItem value="trap_setter">Strategic Trap Setter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Live Arena</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex justify-center py-6">
            <Button 
              size="lg" 
              variant={status === 'recording' ? 'destructive' : 'default'} 
              className="rounded-full w-24 h-24 flex flex-col gap-2 shadow-lg hover:scale-105 transition-transform"
              onClick={toggleRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : status === 'recording' ? (
                <>
                  <Square className="w-8 h-8 fill-current" />
                  <span className="text-xs">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8" />
                  <span className="text-xs">Speak</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {history.length === 0 && (
              <p className="text-center text-muted-foreground text-sm italic">
                Press Speak, deliver your argument, and wait for the AI to respond.
              </p>
            )}
            {history.map((turn, i) => (
              <div key={i} className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-muted-foreground mb-1 px-1 uppercase font-semibold">
                  {turn.role === 'user' ? 'You' : 'AI Opponent'}
                </span>
                <div className={`p-4 rounded-lg max-w-[85%] text-sm leading-relaxed ${turn.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none border'}`}>
                  {turn.text}
                </div>
                {turn.role === 'ai' && (
                  <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-xs" onClick={() => speakText(turn.text)}>
                    <Play className="w-3 h-3 mr-1" /> Replay Audio
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
