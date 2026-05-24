import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trophy, Medal, Star, Shield } from "lucide-react"

export const runtime = 'edge';

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const params = await searchParams
  const skill = params.skill || 'overall'
  const supabase = await createClient()

  const { data: topUsers } = await supabase
    .from('user_skills')
    .select('score, profiles(display_name)')
    .eq('skill_name', skill)
    .order('score', { ascending: false })
    .limit(100)

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-md" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400 drop-shadow-md" />
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600 drop-shadow-md" />
    return <span className="font-mono text-muted-foreground w-5 inline-block text-center">{index + 1}</span>
  }

  return (
    <div className="container max-w-4xl py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          Global Leaderboards
        </h1>
        <p className="text-muted-foreground text-lg">Compare your Debate DNA with the best speakers in the world.</p>
      </div>

      <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
        {['overall', 'structure', 'logic', 'rhetoric', 'rebuttal', 'weighing'].map(s => (
          <a key={s} href={`/leaderboard?skill=${s}`} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border shadow-sm ${skill === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Top 100 - {skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {topUsers?.map((user: any, index: number) => (
              <div key={index} className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${index < 3 ? 'bg-accent/10' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="font-semibold text-lg">{user.profiles?.display_name || 'Anonymous Debater'}</div>
                </div>
                <div className="font-mono text-xl tabular-nums font-bold text-primary">
                  {user.score.toFixed(1)}
                </div>
              </div>
            ))}
            {(!topUsers || topUsers.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                No scores recorded yet. Be the first to claim the top spot!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
