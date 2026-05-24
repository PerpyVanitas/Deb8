"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scale, Star, Medal } from "lucide-react"

type BallotProps = {
  ballot: any
}

export function BallotView({ ballot }: BallotProps) {
  if (!ballot) return null;

  return (
    <Card className="w-full mt-6 border-primary/20 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Judge Ballot
            </CardTitle>
            <CardDescription>Persona: {ballot.judge_persona}</CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Score</span>
              <Badge variant="secondary" className="text-lg py-1 px-3 mt-1"><Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" /> {ballot.speaker_score}</Badge>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Rank</span>
              <Badge variant="default" className="text-lg py-1 px-3 mt-1"><Medal className="w-4 h-4 mr-1 text-blue-300" /> {ballot.ranking}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2 text-primary">Reason for Decision (RFD)</h4>
          <p className="text-sm leading-relaxed text-foreground bg-accent/30 p-4 rounded-md border">{ballot.rfd}</p>
        </div>
        
        {ballot.clash_evaluation && ballot.clash_evaluation.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Clash Evaluation</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {ballot.clash_evaluation.map((clash: any, i: number) => (
                <Card key={i} className="bg-card">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm">Issue: {clash.issue}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-sm">
                    <div className="mb-2">
                      <span className="text-xs uppercase text-muted-foreground font-semibold mr-2">Winner:</span>
                      <Badge variant="outline">{clash.winner}</Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-3">{clash.reason}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
