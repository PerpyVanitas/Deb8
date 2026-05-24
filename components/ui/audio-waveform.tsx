"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AudioWaveformProps {
  isRecording: boolean
  stream?: MediaStream | null
  className?: string
}

export function AudioWaveform({ isRecording, stream, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isRecording || !stream || !canvasRef.current) return

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    analyser.fftSize = 64
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      animationId = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)
      ctx.clearRect(0, 0, width, height)

      const numBars = 5
      const spacing = 4
      const totalSpacing = spacing * (numBars - 1)
      const barWidth = (width - totalSpacing) / numBars
      let x = 0

      for (let i = 0; i < numBars; i++) {
        // Average a chunk of frequencies for each bar to get smoother data
        const startIdx = Math.floor(i * (bufferLength / numBars))
        const endIdx = Math.floor((i + 1) * (bufferLength / numBars))
        let sum = 0
        for (let j = startIdx; j < endIdx; j++) {
          sum += dataArray[j]
        }
        const avg = sum / (endIdx - startIdx) || 0

        // Normalize 0-255 to canvas height, with a minimum height for the visual
        const normalized = avg / 255
        const barHeight = Math.max(8, normalized * height)

        ctx.fillStyle = 'rgb(239, 68, 68)' // Tailwind red-500
        
        ctx.beginPath()
        ctx.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, 4)
        ctx.fill()

        x += barWidth + spacing
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      source.disconnect()
      audioCtx.close().catch(console.error)
    }
  }, [isRecording, stream])

  if (!isRecording) return null

  return (
    <canvas 
      ref={canvasRef} 
      className={cn("h-8 w-16", className)} 
      width={64} 
      height={32}
    />
  )
}
