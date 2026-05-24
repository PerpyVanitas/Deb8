import { useState, useRef } from 'react'

export function useRecorder() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      recorder.start(100) // capture in smaller chunks
      mediaRef.current = recorder
      setStatus('recording')
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Microphone access is required to record your speech.")
    }
  }

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
      mediaRef.current.stream.getTracks().forEach(t => t.stop())
    }
    setStatus('stopped')
  }

  return { status, audioBlob, start, stop }
}
