import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SkillTree } from "@/features/progression/SkillTree"
import { RecentSessions } from "@/features/dashboard/RecentSessions"

export const runtime = 'edge';

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

  const { data: sessions } = await supabase
    .from("debate_sessions")
    .select("id, role, format, status, created_at, motions(text)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: history } = await supabase
    .from("skill_snapshots")
    .select("created_at, scores")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch Motion of the Day
  const today = new Date().toISOString().split('T')[0]
  const { data: motd } = await supabase
    .from("motions")
    .select("*")
    .eq("is_motion_of_the_day", true)
    .eq("motd_date", today)
    .maybeSingle()

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile?.display_name ?? user.email}
          </h1>
          <p className="text-sm text-muted-foreground">{profile?.total_speeches ?? 0} speeches delivered</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.26 10.147a6.04 6.04 0 0 0-.44-2.322A7.535 7.535 0 0 1 2 11.5c0 4.142 3.582 7.5 8 7.5s8-3.358 8-7.5a7.535 7.535 0 0 1-1.82-3.675 6.04 6.04 0 0 0-.44 2.322c0 3.313-2.567 6-5.74 6s-5.74-2.687-5.74-6z"/><path d="m14.5 13-3-5m0 0 2-4-4.5 6-2-2 3.5 7"/></svg>
            {profile?.xp || 0} XP
          </div>
          <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            {profile?.current_streak || 0} Day Streak
          </div>
        </div>
      </div>

      <div className="mb-8">
        <SkillTree debateDna={profile?.debate_dna} history={history || []} />
      </div>

      <div className="mb-8">
        {motd ? (
          <Card className="border-primary/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-bold">DAILY</span>
            </div>
            <CardHeader>
              <CardTitle>Motion of the Day</CardTitle>
              <CardDescription>Earn bonus XP by debating this topic.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium mb-4 line-clamp-3">{motd.text}</p>
              <Button asChild className="w-full">
                <Link href={`/motions?id=${motd.id}`}>Debate this Motion</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start a new round</CardTitle>
              <CardDescription>Pick a motion and a role to begin practice.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/motions">Browse motions</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
          <CardDescription>Your last 5 practice rounds.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSessions initialSessions={sessions || []} userId={user.id} />
        </CardContent>
      </Card>
    </main>
  )
}
