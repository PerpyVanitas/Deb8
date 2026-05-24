import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("is_admin, display_name").eq("id", user.id).maybeSingle()

  if (!profile?.is_admin) {
    redirect("/dashboard")
  }

  const [{ count: userCount }, { count: motionCount }, { count: sessionCount }, { data: recentUsers }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("motions").select("*", { count: "exact", head: true }),
      supabase.from("debate_sessions").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id, display_name, is_admin, total_speeches, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground">Signed in as {profile.display_name ?? user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-3xl">{userCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Motions</CardDescription>
            <CardTitle className="text-3xl">{motionCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sessions</CardDescription>
            <CardTitle className="text-3xl">{sessionCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent users</CardTitle>
          <CardDescription>Latest 10 profiles to join Deb8.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentUsers && recentUsers.length > 0 ? (
            recentUsers.map((u: any) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {u.display_name ?? u.id}
                  {u.is_admin ? <span className="ml-2 text-xs text-primary">admin</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">{u.total_speeches ?? 0} speeches</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
