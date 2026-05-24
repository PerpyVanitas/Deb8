import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const { page = "1", status } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  let q = supabase
    .from("debate_sessions")
    .select(
      "id, role, format, status, created_at, motion_id, user_id, motions(text), profiles!debate_sessions_user_id_fkey(display_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status) q = q.eq("status", status)
  const { data: sessions, count } = await q

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} session{count === 1 ? "" : "s"}
          {status ? ` filtered by "${status}"` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All sessions</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Motion</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sessions ?? []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">
                    {s.profiles?.display_name ?? s.user_id?.slice(0, 8)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-sm truncate text-sm">
                    {s.motions?.text ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{s.role}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{s.format}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!sessions || sessions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No sessions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">unknown</Badge>
  if (status === "completed")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
        completed
      </Badge>
    )
  if (status === "in_progress")
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">
        in progress
      </Badge>
    )
  if (status === "failed")
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/20">
        failed
      </Badge>
    )
  return <Badge variant="secondary">{status}</Badge>
}
