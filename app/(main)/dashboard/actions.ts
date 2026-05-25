"use server"

import { createClient } from "@/lib/supabase/server"

export async function getRecentSessions(userId: string, page: number, limit: number = 5) {
  const supabase = await createClient()
  const from = page * limit
  const to = from + limit - 1

  const { data: sessions, error } = await supabase
    .from("debate_sessions")
    .select("id, role, format, status, created_at, motions(text)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching sessions:", error)
    return []
  }

  return sessions || []
}
