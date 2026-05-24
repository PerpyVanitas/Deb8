"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Trophy, Target, TrendingUp, AlertTriangle, Lightbulb, MessageSquare, Shield, CheckCircle2 } from "lucide-react"

type AnalysisProps = {
  analysis: any
}

export function AnalysisResults({ analysis }: AnalysisProps) {
  const [completedDrills, setCompletedDrills] = useState<Record<number, boolean>>({})

  const { scores, arguments: args, tone, archetype, coaching, rfd_summary } = analysis

  const chartData = [
    { subject: 'Structure', A: scores.structure, fullMark: 10 },
    { subject: 'Logic', A: scores.logic, fullMark: 10 },
    { subject: 'Rhetoric', A: scores.rhetoric, fullMark: 10 },
    { subject: 'Rebuttal', A: scores.rebuttal, fullMark: 10 },
    { subject: 'Weighing', A: scores.weighing, fullMark: 10 },
    { subject: 'Overall', A: scores.overall, fullMark: 10 },
  ]

  const toggleDrill = (index: number) => {
    setCompletedDrills(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Overview & Archetype */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <Card className="flex-1 bg-gradient-to-br from-primary/10 to-background border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> 
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-full justify-center space-y-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Debater Archetype</p>
                <Badge variant="default" className="text-sm px-3 py-1 bg-primary text-primary-foreground">
                  <Shield className="w-4 h-4 mr-2 inline" /> {archetype}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Dominant Tone</p>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <MessageSquare className="w-4 h-4 mr-2 inline" /> {tone}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="flex-1 min-h-[300px]">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Skill Radar</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="hsl(var(--muted))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* RFD */}
      <Card className="border-l-4 border-l-primary bg-accent/30">
        <CardContent className="pt-6">
          <p className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" /> Reason for Decision (RFD) Summary
          </p>
          <blockquote className="text-lg italic text-foreground leading-relaxed">
            "{rfd_summary}"
          </blockquote>
        </CardContent>
      </Card>

      {/* Arguments Extracted */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Arguments Delivered</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {args?.map((arg: any, i: number) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-snug">{arg.claim}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase block mb-1">Mechanism</span>
                  <p className="bg-muted/50 p-2 rounded-md">{arg.mechanism}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase block mb-1">Impact</span>
                  <p className="bg-primary/5 p-2 rounded-md border border-primary/10">{arg.impact}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!args || args.length === 0) && (
            <div className="text-muted-foreground text-sm p-4 border rounded-md">No clear arguments were extracted from the speech.</div>
          )}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingUp className="w-5 h-5" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {coaching?.strengths?.map((s: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" /> Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {coaching?.weaknesses?.map((w: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Drills */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Drills</CardTitle>
          <CardDescription>Targeted exercises based on your performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coaching?.drills?.map((drill: string, i: number) => (
              <div 
                key={i} 
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${completedDrills[i] ? 'bg-muted/50 border-muted' : 'bg-card hover:bg-accent/50'}`}
              >
                <Checkbox 
                  id={`drill-${i}`} 
                  checked={!!completedDrills[i]} 
                  onCheckedChange={() => toggleDrill(i)} 
                  className="mt-1"
                />
                <label 
                  htmlFor={`drill-${i}`} 
                  className={`text-sm leading-relaxed cursor-pointer flex-1 ${completedDrills[i] ? 'line-through text-muted-foreground' : ''}`}
                >
                  {drill}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}
