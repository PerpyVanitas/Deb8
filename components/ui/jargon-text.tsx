"use client"

import React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const JARGON_DICTIONARY: Record<string, string> = {
  "fiat": "The assumption that a proposed policy will be enacted, so debaters can argue whether it *should* be enacted rather than whether it *would* be.",
  "weighing": "Comparing the impacts of different arguments to prove why one is more important than the other (e.g., using magnitude, timeframe, or probability).",
  "impact": "The ultimate consequence or result of an argument.",
  "mechanism": "The logical steps explaining exactly *how* an action leads to an impact.",
  "framing": "Setting the lens or context through which the judge should evaluate the round.",
  "rebuttal": "Directly attacking or disproving the opponent's arguments.",
  "mutually exclusive": "Two things that cannot logically exist or happen at the same time.",
  "status quo": "The current state of affairs before any proposed policy is enacted.",
  "burden of proof": "The obligation to prove a claim made in the debate.",
  "delta": "The exact difference or change caused by a policy compared to the status quo.",
  "poi": "Point of Information: A short question or statement offered during another speaker's speech.",
  "whip": "The final speaker in BP or AP who summarizes the debate and weighs the clashes.",
  "squirrel": "To define the motion in a highly restrictive or unpredictable way to gain an unfair advantage.",
  "knifing": "Contradicting a previous speaker on your own team or bench."
}

export function JargonText({ children }: { children: React.ReactNode }) {
  if (typeof children !== "string") {
    return <>{children}</>
  }

  // Create a regex to match any jargon term, ignoring case
  const words = Object.keys(JARGON_DICTIONARY).sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`\\b(${words.join("|")})\\b`, "gi")

  const parts = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(children)) !== null) {
    if (match.index > lastIndex) {
      parts.push(children.substring(lastIndex, match.index))
    }
    const term = match[0]
    const lowerTerm = term.toLowerCase()
    parts.push(
      <TooltipProvider key={match.index}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted decoration-primary/50 cursor-help font-medium">
              {term}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px] p-3 text-sm shadow-md border-primary/20">
            <p><strong>{term.charAt(0).toUpperCase() + term.slice(1)}:</strong> {JARGON_DICTIONARY[lowerTerm]}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < children.length) {
    parts.push(children.substring(lastIndex))
  }

  return <>{parts}</>
}
