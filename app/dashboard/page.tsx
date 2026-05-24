import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { SkillTree } from "@/features/progression/SkillTree"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
  const isAdmin = !!profile?.is_admin

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
          <ThemeToggle />
          {isAdmin ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Admin</Link>
            </Button>
          ) : null}
          <form action="/auth/signout" method="post">
            <Button variant="outline" size="sm" type="submit" formAction="/auth/signout">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="mb-8">
        <SkillTree debateDna={profile?.debate_dna} history={history || []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Your last 5 practice rounds.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sessions && sessions.length > 0 ? (
              sessions.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="truncate">{s.motions?.text ?? "Untitled motion"}</span>
                  <span className="text-xs text-muted-foreground">{s.role}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
