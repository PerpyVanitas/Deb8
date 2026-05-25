import { redirect } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"
import { createClient } from "@/lib/supabase/server"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, FileText, MessagesSquare, ScrollText, ArrowLeft } from "lucide-react"
import { AdminNavLink } from "./_components/admin-nav-link"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect("/dashboard")

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link href="/admin" className="text-base font-semibold tracking-tight">
            Deb8 Admin
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <AdminNavLink href="/admin" exact icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </AdminNavLink>
          <AdminNavLink href="/admin/users" icon={<Users className="h-4 w-4" />}>
            Users
          </AdminNavLink>
          <AdminNavLink href="/admin/motions" icon={<FileText className="h-4 w-4" />}>
            Motions
          </AdminNavLink>
          <AdminNavLink href="/admin/sessions" icon={<MessagesSquare className="h-4 w-4" />}>
            Sessions
          </AdminNavLink>
          <AdminNavLink href="/admin/audit" icon={<ScrollText className="h-4 w-4" />}>
            Audit log
          </AdminNavLink>
        </nav>
        <div className="border-t border-border p-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to app
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-6">
          <div className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{profile.display_name ?? user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
