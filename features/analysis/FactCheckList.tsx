"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, CheckCircle, AlertCircle, HelpCircle } from "lucide-react"

type FactCheckProps = {
  factChecks: any[]
}

export function FactCheckList({ factChecks }: FactCheckProps) {
  if (!factChecks || factChecks.length === 0) return null;

  const getVerdictIcon = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'true':
        return <CheckCircle className="w-4 h-4 text-green-500 mr-1" />;
      case 'false':
        return <AlertCircle className="w-4 h-4 text-red-500 mr-1" />;
      case 'misleading':
        return <ShieldAlert className="w-4 h-4 text-yellow-500 mr-1" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500 mr-1" />;
    }
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'true':
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case 'false':
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case 'misleading':
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 border-slate-500/20";
    }
  }

  return (
    <Card className="w-full mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Fact Checks
        </CardTitle>
        <CardDescription>Automated verification of claims made during the speech.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factChecks.map((fc, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-base mb-1">"{fc.claim}"</h4>
                <p className="text-sm text-muted-foreground mt-2">{fc.explanation}</p>
                {fc.sources && fc.sources.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold uppercase mr-2">Sources:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {fc.sources.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:w-32 shrink-0">
                <Badge variant="outline" className={`flex items-center capitalize px-2 py-1 border ${getVerdictColor(fc.verdict)}`}>
                  {getVerdictIcon(fc.verdict)} {fc.verdict}
                </Badge>
                <div className="text-xs text-muted-foreground font-medium">
                  {fc.confidence}% Confidence
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
