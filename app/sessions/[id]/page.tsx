import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const runtime = 'edge';

export default async function SessionRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const resolvedParams = await params
  
  const { data: session } = await supabase
    .from("debate_sessions")
    .select("mode, status")
    .eq("id", resolvedParams.id)
    .single()

  if (!session) {
    redirect("/dashboard")
  }

  // If the session has already moved past the initial pending state, go to analysis
  if (session.status !== 'pending') {
    redirect(`/sessions/${resolvedParams.id}/analysis`)
  }

  redirect(`/sessions/${resolvedParams.id}/record`)
}
