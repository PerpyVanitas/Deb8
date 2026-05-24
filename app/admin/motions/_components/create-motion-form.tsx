"use client"

import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createMotion } from "../../_actions"

export function CreateMotionForm() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={(form) =>
        start(async () => {
          setError(null)
          try {
            await createMotion(form)
            const el = document.getElementById("create-motion-form") as HTMLFormElement | null
            el?.reset()
          } catch (e: any) {
            setError(e?.message ?? "Failed to create motion")
          }
        })
      }
      id="create-motion-form"
    >
      <div className="sm:col-span-2 grid gap-2">
        <Label htmlFor="text">Motion text</Label>
        <Input id="text" name="text" placeholder="THW abolish standardized testing" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Select name="category" defaultValue="policy">
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="policy">Policy</SelectItem>
            <SelectItem value="value">Value</SelectItem>
            <SelectItem value="fact">Fact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="topic_domain">Domain</Label>
        <Input id="topic_domain" name="topic_domain" placeholder="education" defaultValue="general" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="difficulty">Difficulty (1–5)</Label>
        <Input id="difficulty" name="difficulty" type="number" min={1} max={5} defaultValue={2} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="format">Format</Label>
        <Select name="format" defaultValue="BP">
          <SelectTrigger id="format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BP">British Parliamentary</SelectItem>
            <SelectItem value="WS">World Schools</SelectItem>
            <SelectItem value="Policy">Policy</SelectItem>
            <SelectItem value="LD">Lincoln-Douglas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2 flex items-center justify-between">
        <p className="text-xs text-red-500">{error}</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add motion"}
        </Button>
      </div>
    </form>
  )
}
