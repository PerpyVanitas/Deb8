import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Trophy, List, Shield, LogOut } from 'lucide-react'

export async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    isAdmin = !!profile?.is_admin
  }

  return (
    <div className="w-64 border-r bg-card h-screen sticky top-0 flex flex-col shrink-0">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
          <span className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm">D8</span>
          <span>Deb8</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
          <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard
        </Link>
        <Link href="/motions" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
          <List className="w-4 h-4 text-muted-foreground" /> Motions
        </Link>
        <Link href="/leaderboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
          <Trophy className="w-4 h-4 text-muted-foreground" /> Leaderboard
        </Link>
        {isAdmin && (
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors">
            <Shield className="w-4 h-4 text-muted-foreground" /> Admin
          </Link>
        )}
      </nav>
      <div className="p-4 border-t flex flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <form action="/auth/signout" method="post" className="w-full">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" type="submit">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
