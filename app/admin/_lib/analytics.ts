import type { SupabaseClient } from "@supabase/supabase-js"

export type DateBucket = { date: string; value: number }

/**
 * Build a contiguous day-by-day series for the last `days` days starting at UTC midnight.
 * Counts rows in `table` by `created_at`.
 */
export async function buildDailySeries(
  supabase: SupabaseClient,
  table: string,
  days: number,
): Promise<DateBucket[]> {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)))

  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .gte("created_at", start.toISOString())

  if (error || !data) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      return { date: d.toISOString().slice(0, 10), value: 0 }
    })
  }

  const counts = new Map<string, number>()
  for (const row of data as { created_at: string }[]) {
    const key = new Date(row.created_at).toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, value: counts.get(key) ?? 0 }
  })
}
