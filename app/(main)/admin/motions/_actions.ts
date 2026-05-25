"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function uploadMotionsCSV(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify admin status
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) throw new Error("Admin access required")

  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  if (lines.length < 2) throw new Error("CSV must contain a header and at least one row")

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const expectedHeaders = ['text', 'category', 'difficulty', 'topic_domain', 'format']
  
  // Minimal validation
  if (!headers.includes('text')) {
    throw new Error("CSV must contain a 'text' column")
  }

  const motionsToInsert = []

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV splitting (does not handle quoted commas properly, but enough for basic use)
    const row = lines[i].split(',').map(c => c.trim())
    const motion: any = {}
    
    headers.forEach((header, index) => {
      if (expectedHeaders.includes(header) && row[index]) {
        if (header === 'difficulty') {
          motion[header] = parseInt(row[index], 10)
        } else {
          motion[header] = row[index].replace(/^"|"$/g, '') // remove surrounding quotes
        }
      }
    })
    
    if (motion.text) {
      motionsToInsert.push(motion)
    }
  }

  if (motionsToInsert.length === 0) throw new Error("No valid motions found in CSV")

  const { error } = await supabase.from("motions").insert(motionsToInsert)
  if (error) {
    console.error(error)
    throw new Error("Failed to insert motions into database")
  }

  revalidatePath("/admin/motions")
  revalidatePath("/motions")
  return { success: true, count: motionsToInsert.length }
}
