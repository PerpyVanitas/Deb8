import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AnalysisResults } from "@/features/analysis/AnalysisResults"
import { AnalysisLoader } from "@/features/analysis/AnalysisLoader"
import { BallotView } from "@/features/analysis/BallotView"
import { FactCheckList } from "@/features/analysis/FactCheckList"
import { BenchmarkingUI } from "@/features/benchmarking/BenchmarkingUI"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const resolvedParams = await params;
  const { data: session } = await supabase
    .from("debate_sessions")
    .select("*, motions(text, category, format)")
    .eq("id", resolvedParams.id)
    .single()

  if (!session || session.user_id !== user.id) {
    redirect("/dashboard")
  }

  // Fetch all analyses for this session
  const [analysisRes, ballotRes, factChecksRes] = await Promise.all([
    supabase.from("analyses").select("*").eq("session_id", resolvedParams.id).order('speaker_index', { ascending: true }),
    supabase.from("ballots").select("*").eq("session_id", resolvedParams.id),
    supabase.from("fact_checks").select("*").eq("session_id", resolvedParams.id)
  ])

  const analyses = analysisRes.data || []
  const ballots = ballotRes.data || []
  const factChecks = factChecksRes.data || []
  const hasAnalysis = analyses.length > 0

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 w-fit mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Speech Analysis</h1>
            <p className="text-muted-foreground mb-4">Detailed breakdown of your performance.</p>
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-md border text-sm">
          <span className="font-semibold block mb-1">Motion:</span>
          {session.motions?.text}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-accent px-2 py-0.5 rounded-full">Role: {session.role}</span>
          </div>
        </div>
      </div>

      {hasAnalysis ? (
        <Tabs defaultValue={`speaker-0`} className="w-full">
          {analyses.length > 1 && (
            <TabsList className="mb-8 w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap gap-2">
              {analyses.map((ana) => (
                <TabsTrigger 
                  key={ana.speaker_index}
                  value={`speaker-${ana.speaker_index}`} 
                  className="rounded-t-md border border-b-0 data-[state=active]:bg-card data-[state=active]:border-primary data-[state=active]:border-b-transparent data-[state=active]:z-10 px-6 py-2 -mb-[1px] font-semibold bg-muted/50"
                >
                  {ana.speaker_role || `Speaker ${ana.speaker_index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {analyses.map((analysis) => {
            const speakerFactChecks = factChecks.filter(fc => fc.speaker_index === analysis.speaker_index)
            const speakerBallot = ballots.find(b => b.speaker_index === analysis.speaker_index)
            
            return (
              <TabsContent key={analysis.speaker_index} value={`speaker-${analysis.speaker_index}`} className="mt-0">
                <Tabs defaultValue="scorecard" className="w-full">
                  <TabsList className="mb-8 w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger value="scorecard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-semibold">
                      Speech Scorecard
                    </TabsTrigger>
                    <TabsTrigger value="factcheck" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-semibold">
                      Fact Checks
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="scorecard" className="space-y-8 animate-in fade-in-50 duration-500">
                    <AnalysisResults analysis={analysis} />
                    {analysis.elite_benchmark && <BenchmarkingUI benchmark={analysis.elite_benchmark} />}
                    {speakerBallot && <BallotView ballot={speakerBallot} />}
                  </TabsContent>

                  <TabsContent value="factcheck" className="space-y-8 animate-in fade-in-50 duration-500">
                    {speakerFactChecks.length > 0 ? (
                      <FactCheckList factChecks={speakerFactChecks} />
                    ) : (
                      <div className="p-12 text-center text-muted-foreground border rounded-lg bg-card">
                        <p>No factual claims were flagged in this speech.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <AnalysisLoader sessionId={resolvedParams.id} />
      )}
    </main>
  )
}
