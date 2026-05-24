"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PenLine } from "lucide-react"

export function FlowSheet() {
  const [notes, setNotes] = useState("")

  return (
    <Card className="w-full h-full flex flex-col border-dashed bg-muted/30">
      <CardHeader className="py-3 px-4 border-b bg-background">
        <CardTitle className="text-sm flex items-center gap-2">
          <PenLine className="w-4 h-4 text-primary" />
          Digital Flow Sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex">
        <Textarea 
          placeholder="Jot down arguments, rebuttals, and POIs here. These notes are saved locally to your device during this session..."
          className="flex-1 min-h-[300px] md:min-h-full resize-none border-0 rounded-none focus-visible:ring-0 bg-transparent p-4 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </CardContent>
    </Card>
  )
}
