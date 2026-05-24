import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OpponentArena } from "@/features/opponent/OpponentArena"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ArenaPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: session } = await supabase
    .from("debate_sessions")
    .select("*, motions(text, category, difficulty, format)")
    .eq("id", (await params).id)
    .single()

  if (!session || session.user_id !== user.id) {
    redirect("/dashboard")
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 w-fit mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-2">1v1 Training Arena</h1>
        <div className="bg-accent/50 p-4 rounded-md border text-sm">
          <span className="font-semibold block mb-1">Motion:</span>
          {session.motions?.text}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="bg-background px-2 py-1 rounded border">Role: {session.role}</span>
            <span className="bg-background px-2 py-1 rounded border">Format: {session.format}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <OpponentArena session={session} />
      </div>
    </main>
  )
}
