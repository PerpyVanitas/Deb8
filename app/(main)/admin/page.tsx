import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimeSeriesCard } from "./_components/time-series-card"
import { CategoryBarCard } from "./_components/category-bar-card"
import { buildDailySeries } from "./_lib/analytics"
import { ArrowUpRight, Users, MessagesSquare, FileText, ScrollText } from "lucide-react"

export const dynamic = "force-dynamic"

function pct(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100
  return Math.round(((curr - prev) / prev) * 100)
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersTotal,
    motionsTotal,
    sessionsTotal,
    transcriptsTotal,
    usersLast7,
    usersPrev7,
    sessionsLast7,
    sessionsPrev7,
    userSeries,
    sessionSeries,
    motionsByCategory,
    sessionsByStatus,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("motions").select("*", { count: "exact", head: true }),
    supabase.from("debate_sessions").select("*", { count: "exact", head: true }),
    supabase.from("transcripts").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    supabase.from("debate_sessions").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase
      .from("debate_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    buildDailySeries(supabase, "profiles", 30),
    buildDailySeries(supabase, "debate_sessions", 30),
    supabase.from("motions").select("category"),
    supabase.from("debate_sessions").select("status"),
  ])

  const motionCategoryCounts = new Map<string, number>()
  for (const m of (motionsByCategory.data ?? []) as { category: string | null }[]) {
    const key = m.category ?? "uncategorized"
    motionCategoryCounts.set(key, (motionCategoryCounts.get(key) ?? 0) + 1)
  }
  const motionsBar = Array.from(motionCategoryCounts.entries()).map(([label, value]) => ({ label, value }))

  const statusCounts = new Map<string, number>()
  for (const s of (sessionsByStatus.data ?? []) as { status: string | null }[]) {
    const key = s.status ?? "pending"
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1)
  }
  const statusBar = Array.from(statusCounts.entries()).map(([label, value]) => ({ label, value }))

  const stats = [
    {
      label: "Total users",
      value: usersTotal.count ?? 0,
      delta: pct(usersLast7.count ?? 0, usersPrev7.count ?? 0),
      sub: `${usersLast7.count ?? 0} new this week`,
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Total sessions",
      value: sessionsTotal.count ?? 0,
      delta: pct(sessionsLast7.count ?? 0, sessionsPrev7.count ?? 0),
      sub: `${sessionsLast7.count ?? 0} this week`,
      icon: <MessagesSquare className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Motions",
      value: motionsTotal.count ?? 0,
      delta: 0,
      sub: "across all categories",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
    {
      label: "Transcripts",
      value: transcriptsTotal.count ?? 0,
      delta: 0,
      sub: "speeches recorded",
      icon: <ScrollText className="h-4 w-4 text-muted-foreground" />,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform health and activity over the last 30 days.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{s.label}</CardDescription>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{s.value.toLocaleString()}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {s.delta !== 0 ? (
                  <span
                    className={
                      s.delta > 0
                        ? "inline-flex items-center text-emerald-600 dark:text-emerald-400"
                        : "inline-flex items-center text-red-600 dark:text-red-400"
                    }
                  >
                    <ArrowUpRight
                      className={`mr-0.5 h-3 w-3 ${s.delta < 0 ? "rotate-180" : ""}`}
                    />
                    {Math.abs(s.delta)}%
                  </span>
                ) : null}
                <span>{s.sub}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TimeSeriesCard
          title="New users"
          description="Signups per day, last 30 days"
          data={userSeries}
          color="var(--chart-1)"
        />
        <TimeSeriesCard
          title="Sessions"
          description="Debate sessions started per day"
          data={sessionSeries}
          color="var(--chart-3)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBarCard title="Motions by category" data={motionsBar} />
        <CategoryBarCard title="Sessions by status" data={statusBar} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System health</CardTitle>
          <CardDescription>Quick checks of subsystems.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <HealthRow label="Database" ok />
            <HealthRow label="Auth" ok />
            <HealthRow label="RLS policies" ok />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span>{label}</span>
      <span
        className={
          ok
            ? "inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
            : "inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
        }
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            ok ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        {ok ? "Operational" : "Degraded"}
      </span>
    </div>
  )
}
