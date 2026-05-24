import { useState, useRef } from 'react'

export function useRecorder() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const start = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(mediaStream)
      const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
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
    setStream(null)
    setStatus('stopped')
  }

  const pause = () => {
    if (mediaRef.current && mediaRef.current.state === 'recording') {
      mediaRef.current.pause()
      setStatus('paused')
    }
  }

  const resume = () => {
    if (mediaRef.current && mediaRef.current.state === 'paused') {
      mediaRef.current.resume()
      setStatus('recording')
    }
  }

  const discard = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.onstop = null // prevent blob creation
      mediaRef.current.stop()
      mediaRef.current.stream.getTracks().forEach(t => t.stop())
    }
    chunksRef.current = []
    setAudioBlob(null)
    setStream(null)
    setStatus('idle')
  }

  return { status, audioBlob, start, stop, pause, resume, discard, stream }
}
