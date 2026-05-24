"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type Motion = {
  id: string
  text: string
  category: string
  difficulty: number
  topic_domain: string
  format: string
}

export function MotionSelector({ motions }: { motions: Motion[] }) {
  const router = useRouter()
  const [selectedMotionId, setSelectedMotionId] = useState<string>("")
  const [role, setRole] = useState<string>("PM")
  const [isLoading, setIsLoading] = useState(false)

  const roles = [
    { value: "PM", label: "Prime Minister" },
    { value: "LO", label: "Leader of Opposition" },
    { value: "DPM", label: "Deputy Prime Minister" },
    { value: "DLO", label: "Deputy Leader of Opposition" },
    { value: "MG", label: "Member for Government" },
    { value: "MO", label: "Member for Opposition" },
    { value: "GW", label: "Government Whip" },
    { value: "OW", label: "Opposition Whip" },
  ]

  const handleStartSession = async () => {
    if (!selectedMotionId) return
    setIsLoading(true)
    const motion = motions.find(m => m.id === selectedMotionId)

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motion_id: selectedMotionId,
          role,
          format: motion?.format || "BP"
        })
      })

      if (!res.ok) throw new Error("Failed to start session")
      const session = await res.json()
      router.push(`/sessions/${session.id}/record`)
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border p-4 rounded-md bg-card">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label} ({r.value})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end self-stretch pt-5">
          <Button 
            onClick={handleStartSession} 
            disabled={!selectedMotionId || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Starting..." : "Start Session"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {motions.map((m) => (
          <Card 
            key={m.id} 
            className={`cursor-pointer transition-colors ${selectedMotionId === m.id ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedMotionId(m.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-snug">{m.text}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground pb-4">
              <Badge variant="outline">{m.category}</Badge>
              <Badge variant="outline">{m.topic_domain}</Badge>
              <Badge variant="outline">Difficulty {m.difficulty}/5</Badge>
              <Badge variant="outline">{m.format}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
