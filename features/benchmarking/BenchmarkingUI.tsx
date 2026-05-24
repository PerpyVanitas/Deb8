"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Quote } from "lucide-react"

type BenchmarkingProps = {
  benchmark: {
    userSegment: string
    segmentType: string
    eliteDebater: string
    eliteSegment: string
    comparison: string
  } | null
}

export function BenchmarkingUI({ benchmark }: BenchmarkingProps) {
  if (!benchmark) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Quote className="w-5 h-5 text-primary" /> Elite Benchmarking
        </CardTitle>
        <CardDescription>
          Automated comparison of your {benchmark.segmentType} against an elite match.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card p-4 rounded-md border flex flex-col gap-2 shadow-sm">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Your Speech</span>
            <p className="text-sm italic border-l-2 pl-3 border-muted-foreground/30 text-muted-foreground">
              "{benchmark.userSegment}"
            </p>
          </div>
          <div className="bg-card p-4 rounded-md border flex flex-col gap-2 shadow-sm relative">
            <span className="text-xs uppercase font-bold text-primary tracking-wider flex items-center gap-2">
              Elite: {benchmark.eliteDebater}
              <Badge variant="default" className="text-[10px] h-4 px-1 absolute -top-2 -right-2">RAG Match</Badge>
            </span>
            <p className="text-sm italic border-l-2 pl-3 border-primary/50 text-foreground">
              "{benchmark.eliteSegment}"
            </p>
          </div>
        </div>

        <div className="bg-accent/50 p-4 rounded-md flex gap-4 items-start border">
          <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-1" />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">AI Coach Comparison</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {benchmark.comparison}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
