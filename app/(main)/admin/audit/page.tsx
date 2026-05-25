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

export default async function AdminAuditPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from("admin_audit_logs")
    .select(
      "id, action, target_type, target_id, metadata, created_at, profiles!admin_audit_logs_actor_id_fkey(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Last 200 admin actions. Useful for compliance and debugging.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Promotions, demotions, motion edits and more.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden md:table-cell">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{l.profiles?.display_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {l.target_type ? `${l.target_type}:${(l.target_id ?? "").slice(0, 8)}` : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-sm truncate">
                    {l.metadata ? JSON.stringify(l.metadata) : ""}
                  </TableCell>
                </TableRow>
              ))}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No admin activity yet.
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
