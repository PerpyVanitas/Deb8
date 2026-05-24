"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, Bell } from "lucide-react"

export function PrepTimer({ initialMinutes = 15 }: { initialMinutes?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1)
      }, 1000)
    } else if (secondsLeft === 0) {
      setIsActive(false)
      // Play a bell sound or similar notification
      try {
        const audio = new Audio('/bell.mp3') // Will silently fail if no bell.mp3 exists
        audio.play()
      } catch (e) {}
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, secondsLeft])

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const toggle = () => setIsActive(!isActive)
  const reset = () => {
    setIsActive(false)
    setSecondsLeft(initialMinutes * 60)
  }

  return (
    <Card className="w-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          Prep Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex flex-col items-center gap-4">
        <div className={`text-4xl font-mono tabular-nums font-bold ${secondsLeft <= 60 ? 'text-destructive animate-pulse' : ''}`}>
          {formatTime(secondsLeft)}
        </div>
        <div className="flex items-center gap-2 w-full">
          <Button variant={isActive ? "outline" : "default"} onClick={toggle} className="flex-1">
            {isActive ? 'Pause' : 'Start Prep'}
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
