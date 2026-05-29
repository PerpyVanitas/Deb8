"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { 
  Trophy, TrendingUp, AlertTriangle, MessageSquare, 
  Target, Zap, Download, FileText, CheckCircle2, Dumbbell,
  Lightbulb, Activity, Waves, Loader2, Shield, BarChart3, RefreshCw
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { JargonText } from "@/components/ui/jargon-text"

const CHART_COLORS = {
  primary: "#2563eb",
  foreground: "#e5e7eb",
  muted: "#e5e7eb",
  card: "#ffffff",
  border: "#d1d5db"
}

type AnalysisProps = {
  analysis: any
  sessionId: string
  transcriptText?: string
  isComplete?: boolean
  wpm?: number | null
}

export function AnalysisResults({ analysis, sessionId, transcriptText, isComplete = true, wpm }: AnalysisProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'overview'
  
  const [completedDrills, setCompletedDrills] = useState<Record<number, boolean>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const { scores, arguments: args, tone, archetype, coaching, rfd_summary } = analysis
  const isDegraded = typeof rfd_summary === 'string' && /unable to analyze|ai quota|quota limits/i.test(rfd_summary)

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

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const exportPdf = async () => {
    setIsExporting(true)
    try {
      const element = document.getElementById("pdf-content")
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        onclone: (clonedDocument) => {
          const style = clonedDocument.createElement("style")
          style.textContent = `
            #pdf-content,
            #pdf-content * {
              background-color: #ffffff !important;
              color: #111827 !important;
              border-color: #d1d5db !important;
              box-shadow: none !important;
            }
            #pdf-content svg,
            #pdf-content svg * {
              background-color: transparent !important;
            }
            #pdf-content .recharts-polar-grid-angle line,
            #pdf-content .recharts-polar-grid-concentric polygon,
            #pdf-content .recharts-cartesian-grid line {
              stroke: #e5e7eb !important;
            }
            #pdf-content .recharts-radar-polygon {
              stroke: #2563eb !important;
              fill: rgba(37, 99, 235, 0.35) !important;
            }
          `
          clonedDocument.head.appendChild(style)
        }
      })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Deb8-Analysis-${analysis.archetype.replace(/\s+/g, '-')}.pdf`)
    } catch (error) {
      console.error("PDF Export Error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const retryAnalysis = async () => {
    setIsRetrying(true)
    try {
      const harshness = localStorage.getItem('deb8_harshness') || 'Standard'
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, harshness })
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      router.refresh()
    } catch (error) {
      console.error("Retry Analysis Error:", error)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">AI Feedback Report</h2>
        <div className="flex items-center gap-2">
          {isDegraded && (
            <Button variant="default" size="sm" onClick={retryAnalysis} disabled={isRetrying}>
              {isRetrying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Retry Analysis
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      {isDegraded && (
        <Card className="border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="p-4 text-sm text-yellow-700 dark:text-yellow-300">
            The saved result is a fallback, not a real AI analysis. Your transcript is preserved below; retry when the Gemini quota is available.
          </CardContent>
        </Card>
      )}

      <div id="pdf-content" className="bg-background rounded-lg p-2">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="overview" className="flex gap-2"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="arguments" className="flex gap-2"><Lightbulb className="w-4 h-4" /> Arguments</TabsTrigger>
          <TabsTrigger value="coaching" className="flex gap-2"><Dumbbell className="w-4 h-4" /> Coaching</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
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
                    <PolarGrid stroke={CHART_COLORS.muted} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: CHART_COLORS.foreground, fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: CHART_COLORS.card, borderRadius: '8px', border: `1px solid ${CHART_COLORS.border}`, color: CHART_COLORS.foreground }} />
                    <Radar name="Score" dataKey="A" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.4} />
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
        </TabsContent>

        <TabsContent value="arguments" className="space-y-4 mt-0">
          {transcriptText && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-primary" /> Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                  {transcriptText}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" /> Arguments Delivered</h3>
            <p className="text-sm text-muted-foreground">Extracted from your speech transcript</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {args?.map((arg: any, i: number) => (
              <Card key={i} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base leading-snug">{arg.claim}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-muted-foreground text-xs uppercase block mb-1">Mechanism</span>
                    <p className="bg-muted/50 p-3 rounded-md leading-relaxed">{arg.mechanism}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground text-xs uppercase block mb-1">Impact</span>
                    <p className="bg-primary/5 p-3 rounded-md border border-primary/10 leading-relaxed font-medium">{arg.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!args || args.length === 0) && !isDegraded && !isComplete && (
              <div className="text-muted-foreground text-sm p-8 text-center border rounded-md col-span-2 bg-muted/20">
                Arguments are still being extracted. This section will appear automatically when the next analysis stage finishes.
              </div>
            )}
            {(!args || args.length === 0) && (isDegraded || isComplete) && (
              <div className="text-muted-foreground text-sm p-8 text-center border rounded-md col-span-2 bg-muted/20">
                No clear structured arguments were extracted from the speech. Try to signpost your claims more clearly.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coaching" className="space-y-6 mt-0">
          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <TrendingUp className="w-5 h-5" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {coaching?.strengths?.map((s: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="w-full"><JargonText>{s}</JargonText></span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-rose-500/30 bg-rose-500/5 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                  <AlertTriangle className="w-5 h-5" /> Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {coaching?.weaknesses?.map((w: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed items-start">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                      <span className="w-full"><JargonText>{w}</JargonText></span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Stylistics */}
          {coaching?.stylistics && (
            <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" /> Delivery & Stylistics
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1 p-3 rounded-md bg-background border">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Pacing</span>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Waves className="w-4 h-4 text-blue-500" /> 
                    {coaching.stylistics.pace}
                    {wpm ? ` (${wpm} WPM)` : ''}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-background border">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Filler Words</span>
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" /> {coaching.stylistics.filler_words} detected
                  </span>
                </div>
                <div className="sm:col-span-3 mt-2 text-sm leading-relaxed text-foreground/90">
                  <strong>Coach's Note:</strong> <JargonText>{coaching.stylistics.feedback}</JargonText>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommended Drills */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" /> Recommended Drills</CardTitle>
              <CardDescription>Targeted exercises based on your performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coaching?.drills?.map((drill: string, i: number) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 ${completedDrills[i] ? 'bg-muted/30 border-muted opacity-75' : 'bg-card hover:bg-accent/30 hover:border-primary/30 hover:shadow-sm'}`}
                  >
                    <Checkbox 
                      id={`drill-${i}`} 
                      checked={!!completedDrills[i]} 
                      onCheckedChange={() => toggleDrill(i)} 
                      className="mt-1"
                    />
                    <label 
                      htmlFor={`drill-${i}`} 
                      className={`text-sm leading-relaxed cursor-pointer flex-1 transition-all ${completedDrills[i] ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                    >
                      {drill}
                    </label>
                  </div>
                ))}
                {(!coaching?.drills || coaching.drills.length === 0) && !isDegraded && !isComplete && (
                  <div className="text-muted-foreground text-sm p-6 text-center border rounded-md bg-muted/20">
                    Coaching drills are still being generated.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
