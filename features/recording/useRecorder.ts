import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { set, get, del } from 'idb-keyval'

export function useRecorder() {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const autosaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check for crashed/unsaved recordings on mount
  useEffect(() => {
    get('unsaved_audio').then(blob => {
      if (blob) {
        toast("Unsaved Recording Found", {
          description: "We recovered a recording that didn't finish uploading.",
          action: { label: "Dismiss", onClick: () => {} },
        })
        setAudioBlob(blob as Blob)
      }
    })
  }, [])

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
      
      // Autosave to IndexedDB every 5 seconds
      autosaveIntervalRef.current = setInterval(() => {
        if (chunksRef.current.length > 0) {
          set('unsaved_audio', new Blob(chunksRef.current, { type: 'audio/webm' })).catch(console.error)
        }
      }, 5000)
    } catch (err: any) {
      console.error("Error accessing microphone:", err)
      if (err.name === 'NotAllowedError') {
        toast.error("Microphone Access Blocked", {
          description: "Please click the lock icon in your URL bar, allow microphone access, and refresh the page.",
          duration: 10000,
        })
      } else {
        toast.error("Microphone Error", {
          description: err.message || "Could not access the microphone.",
        })
      }
      setStatus('idle')
    }
  }

  const stop = () => {
    if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current)
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
    if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current)
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.onstop = null // prevent blob creation
      mediaRef.current.stop()
      mediaRef.current.stream.getTracks().forEach(t => t.stop())
    }
    chunksRef.current = []
    setAudioBlob(null)
    setStream(null)
    setStatus('idle')
    del('unsaved_audio').catch(console.error)
  }

  const clearAutosave = () => {
    del('unsaved_audio').catch(console.error)
  }

  return { status, audioBlob, start, stop, pause, resume, discard, stream, clearAutosave }
}
