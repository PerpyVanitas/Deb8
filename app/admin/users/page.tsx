import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserAdminToggle } from "./_components/user-admin-toggle"
import Link from "next/link"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page = "1" } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  let query = supabase
    .from("profiles")
    .select("id, display_name, is_admin, total_speeches, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (q) {
    query = query.ilike("display_name", `%${q}%`)
  }

  const { data: users, count } = await query
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {count ?? 0} total profile{count === 1 ? "" : "s"}
          </p>
        </div>
        <form className="w-full max-w-xs">
          <Input name="q" defaultValue={q} placeholder="Search by display name" />
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users</CardTitle>
          <CardDescription>Promote, demote, and audit user activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="hidden md:table-cell">Speeches</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}…</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{u.total_speeches ?? 0}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge>admin</Badge>
                    ) : (
                      <Badge variant="secondary">member</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserAdminToggle userId={u.id} isAdmin={!!u.is_admin} />
                  </TableCell>
                </TableRow>
              ))}
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination currentPage={pageNum} totalPages={totalPages} q={q} />
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  q,
}: {
  currentPage: number
  totalPages: number
  q: string
}) {
  if (totalPages <= 1) return null
  const prev = Math.max(1, currentPage - 1)
  const next = Math.min(totalPages, currentPage + 1)
  const qs = (p: number) => `?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={qs(prev)}
          aria-disabled={currentPage === 1}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Previous
        </Link>
        <Link
          href={qs(next)}
          aria-disabled={currentPage === totalPages}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Next
        </Link>
      </div>
    </div>
  )
}
