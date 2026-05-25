"use server"

import { createClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"

const fetchMotionsFromDb = async (page: number, searchQuery: string, limit: number) => {
  const supabase = await createClient()
  const from = page * limit
  const to = from + limit - 1

  let query = supabase
    .from("motions")
    .select("*")
    .order("created_at", { ascending: false })

  if (searchQuery) {
    query = query.or(`text.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,topic_domain.ilike.%${searchQuery}%`)
  }

  const { data: motions, error } = await query.range(from, to)
  
  if (error) {
    console.error("Error fetching motions:", error)
    return []
  }

  return motions || []
}

export async function getMotions(page: number, searchQuery: string = "", limit: number = 10) {
  return fetchMotionsFromDb(page, searchQuery, limit)
}
