import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RecordingPanel } from "@/features/recording/RecordingPanel"
import { PrepTimer } from "@/features/recording/PrepTimer"
import { FlowSheet } from "@/features/recording/FlowSheet"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function RecordPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ speaker?: string }> }) {
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

  const speakerIndex = parseInt((await searchParams).speaker || "0")
  let maxSpeakers = 1
  if (session.mode === 'human_vs_human_1v1') maxSpeakers = 2
  else if (session.mode === 'human_vs_human_3v3') maxSpeakers = 6

  // Define roles based on format/mode for the UI
  let currentRole = session.role
  if (session.mode.startsWith('human_vs_human')) {
    const roles1v1 = ['Affirmative', 'Negative']
    const roles3v3 = ['Prime Minister', 'Leader of Opposition', 'Deputy Prime Minister', 'Deputy Leader of Opposition', 'Government Whip', 'Opposition Whip']
    if (session.mode === 'human_vs_human_1v1') currentRole = roles1v1[speakerIndex] || 'Speaker'
    if (session.mode === 'human_vs_human_3v3') currentRole = roles3v3[speakerIndex] || 'Speaker'
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 w-fit mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Speech Recording</h1>
        <div className="bg-accent/50 p-4 rounded-md border text-sm">
          <span className="font-semibold block mb-1">Motion:</span>
          {session.motions?.text}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="bg-background px-2 py-1 rounded border">Role: {session.role}</span>
            <span className="bg-background px-2 py-1 rounded border">Format: {session.motions?.format}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          {speakerIndex === 0 && <PrepTimer initialMinutes={15} />}
          <RecordingPanel 
            sessionId={session.id} 
            userId={user.id} 
            speakerIndex={speakerIndex}
            speakerRole={currentRole}
            maxSpeakers={maxSpeakers}
          />
        </div>
        <div className="h-[500px] md:h-full pb-8">
          <FlowSheet />
        </div>
      </div>
    </main>
  )
}
