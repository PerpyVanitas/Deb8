"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Trophy, TrendingUp, Shield } from "lucide-react"

type SkillSnapshot = {
  created_at: string
  scores: Record<string, number>
}

type SkillTreeProps = {
  debateDna: Record<string, number> | null
  history: SkillSnapshot[]
}

export function SkillTree({ debateDna, history }: SkillTreeProps) {
  if (!debateDna || Object.keys(debateDna).length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <Shield className="w-12 h-12 mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg text-foreground mb-1">No Debate DNA Yet</h3>
          <p>Complete your first debate session to generate your performance profile.</p>
        </CardContent>
      </Card>
    )
  }

  const radarData = Object.keys(debateDna).map(key => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1),
    Score: debateDna[key],
    fullMark: 10,
  }))

  const lineData = history.map((h, i) => {
    const date = new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return {
      name: `Session ${history.length - i}`, // Reverse index if sorted descending
      date: date,
      Structure: h.scores?.structure || 0,
      Logic: h.scores?.logic || 0,
      Rhetoric: h.scores?.rhetoric || 0,
      Rebuttal: h.scores?.rebuttal || 0,
      Weighing: h.scores?.weighing || 0,
      Overall: h.scores?.overall || 0,
    }
  }).reverse() // Chronological order for line chart

  const isScaleMaster = (debateDna.weighing || 0) >= 8

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* DNA Radar & Badges */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <Card className="flex-1 bg-gradient-to-br from-primary/10 to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> 
              Your Debate DNA
            </CardTitle>
            <CardDescription>Rolling average of your last 10 sessions</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(var(--muted))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Radar name="DNA Profile" dataKey="Score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Badges & Milestones */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border flex flex-col items-center justify-center text-center gap-2 transition-colors ${isScaleMaster ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-muted/50 opacity-50 grayscale'}`}>
                <Trophy className={`w-8 h-8 ${isScaleMaster ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm">Scale Master</span>
                <span className="text-xs text-muted-foreground">Achieve 8.0+ Weighing average</span>
              </div>
              
              <div className={`p-4 rounded-lg border flex flex-col items-center justify-center text-center gap-2 bg-primary/10 border-primary/30`}>
                <TrendingUp className="w-8 h-8 text-primary" />
                <span className="font-semibold text-sm">Rising Star</span>
                <span className="text-xs text-muted-foreground">Complete 1st session</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progression Over Time */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Skill Progression</CardTitle>
            <CardDescription>Track your scores across all sessions</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="Overall" stroke="hsl(var(--primary))" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Logic" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Rhetoric" stroke="#ec4899" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
