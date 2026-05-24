import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function MotionsPage() {
  const supabase = await createClient()
  const { data: motions } = await supabase
    .from("motions")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Motion library</h1>
          <p className="text-sm text-muted-foreground">Pick a motion to practice.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {motions?.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-base">{m.text}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border px-2 py-0.5">{m.category}</span>
              <span className="rounded-full border border-border px-2 py-0.5">{m.topic_domain}</span>
              <span className="rounded-full border border-border px-2 py-0.5">Difficulty {m.difficulty}/5</span>
              <span className="rounded-full border border-border px-2 py-0.5">{m.format}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
