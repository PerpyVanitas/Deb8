"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadMotionsCSV } from "../_actions"
import { toast } from "sonner"
import { Upload, FileText, Loader2 } from "lucide-react"

export function BulkUploadForm() {
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get("file") as File
    
    if (!file || file.size === 0) {
      toast.error("Please select a valid CSV file")
      return
    }

    setIsPending(true)
    try {
      const res = await uploadMotionsCSV(formData)
      toast.success(`Successfully imported ${res.count} motions!`)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      toast.error(err.message || "Failed to upload CSV")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input 
          type="file" 
          name="file" 
          accept=".csv" 
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Upload
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Format: text, category, difficulty, topic_domain, format
      </p>
    </form>
  )
}
