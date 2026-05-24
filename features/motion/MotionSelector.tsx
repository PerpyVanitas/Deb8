"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Search, Loader2 } from "lucide-react"
import { getMotions } from "@/app/motions/actions"

type Motion = {
  id: string
  text: string
  category: string
  difficulty: number
  topic_domain: string
  format: string
}

const FORMAT_ROLES: Record<string, { value: string, label: string }[]> = {
  "BP": [
    { value: "PM", label: "Prime Minister" },
    { value: "LO", label: "Leader of Opposition" },
    { value: "DPM", label: "Deputy Prime Minister" },
    { value: "DLO", label: "Deputy Leader of Opposition" },
    { value: "MG", label: "Member for Government" },
    { value: "MO", label: "Member for Opposition" },
    { value: "GW", label: "Government Whip" },
    { value: "OW", label: "Opposition Whip" },
  ],
  "AP": [
    { value: "AP_PM", label: "Prime Minister" },
    { value: "AP_LO", label: "Leader of Opposition" },
    { value: "AP_DPM", label: "Deputy Prime Minister" },
    { value: "AP_DLO", label: "Deputy Leader of Opposition" },
    { value: "AP_GW", label: "Government Whip" },
    { value: "AP_OW", label: "Opposition Whip" },
    { value: "AP_GR", label: "Government Reply" },
    { value: "AP_OR", label: "Opposition Reply" },
  ],
  "Oregon-Oxford": [
    { value: "OO_AC", label: "Affirmative Constructive" },
    { value: "OO_NC", label: "Negative Constructive" },
    { value: "OO_AX", label: "Affirmative Interpellator" },
    { value: "OO_NX", label: "Negative Interpellator" },
    { value: "OO_AR", label: "Affirmative Rebuttal" },
    { value: "OO_NR", label: "Negative Rebuttal" },
  ],
  "General": [
    { value: "Affirmative", label: "Affirmative" },
    { value: "Negative", label: "Negative" },
  ]
}

export function MotionSelector({ motions }: { motions: Motion[] }) {
  const router = useRouter()
  const [selectedMotionId, setSelectedMotionId] = useState<string>("")
  const [format, setFormat] = useState<string>("BP")
  const [role, setRole] = useState<string>("PM")
  const [is1v1, setIs1v1] = useState(true)
  const [harshness, setHarshness] = useState<string>("Standard")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('deb8_harshness')
    if (saved) setHarshness(saved)
  }, [])

  const handleHarshnessChange = (val: string) => {
    setHarshness(val)
    localStorage.setItem('deb8_harshness', val)
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loadedMotions, setLoadedMotions] = useState<Motion[]>(motions)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(motions.length === 10)
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch on search change
  useEffect(() => {
    let mounted = true
    const fetchSearched = async () => {
      // Don't refetch on initial mount if search is empty
      if (debouncedSearch === "" && loadedMotions.length > 0 && page === 0) return

      setIsFetchingMore(true)
      const newMotions = await getMotions(0, debouncedSearch, 10)
      if (mounted) {
        setLoadedMotions(newMotions)
        setPage(0)
        setHasMore(newMotions.length === 10)
        setIsFetchingMore(false)
      }
    }
    fetchSearched()
    return () => { mounted = false }
  }, [debouncedSearch])

  const loadMore = async () => {
    setIsFetchingMore(true)
    const nextPage = page + 1
    const newMotions = await getMotions(nextPage, debouncedSearch, 10)
    setLoadedMotions(prev => [...prev, ...newMotions])
    setPage(nextPage)
    setHasMore(newMotions.length === 10)
    setIsFetchingMore(false)
  }

  // Reset role when format changes
  useEffect(() => {
    setRole(FORMAT_ROLES[format][0].value)
  }, [format])

  const handleStartSession = async () => {
    if (!selectedMotionId) return
    setIsLoading(true)

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motion_id: selectedMotionId,
          role,
          format: is1v1 ? `${format}_1v1` : format
        })
      })

      if (!res.ok) throw new Error("Failed to start session")
      const session = await res.json()
      
      // If 1v1 mode is active, we should route to a 1v1 Arena. 
      // Otherwise, the standard record & analyze pipeline.
      if (is1v1) {
        router.push(`/sessions/${session.id}/arena`)
      } else {
        router.push(`/sessions/${session.id}/record`)
      }
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
      <Card className="border p-4 rounded-md bg-card shadow-sm">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-lg">Arena Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-0 grid gap-6 sm:grid-cols-2 md:grid-cols-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Format
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs leading-relaxed">Different debate regions use different speaker rules and limits. British Parliamentary is the global standard.</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BP">British Parliamentary</SelectItem>
                <SelectItem value="AP">Asian Parliamentary</SelectItem>
                <SelectItem value="Oregon-Oxford">Oregon-Oxford</SelectItem>
                <SelectItem value="General">General Free-Sparring</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_ROLES[format].map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between border rounded-md p-2 px-3 h-10">
            <label className="text-sm font-medium cursor-pointer flex items-center gap-2" htmlFor="mode-toggle">
              1v1 Training Mode
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs leading-relaxed">Turn this on to spar against an AI opponent in real-time. Turn off to record a full solo speech for pure analysis.</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Switch id="mode-toggle" checked={is1v1} onCheckedChange={setIs1v1} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              AI Harshness
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs leading-relaxed">Adjusts how critical the AI coach is. Gentle offers more praise, Ruthless provides elite-level scrutiny.</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <Select value={harshness} onValueChange={handleHarshnessChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select Harshness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gentle">Gentle Coach</SelectItem>
                <SelectItem value="Standard">Standard Judge</SelectItem>
                <SelectItem value="Ruthless">Ruthless Critic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-4 flex justify-end pt-2 border-t mt-2">
            <Button 
              onClick={handleStartSession} 
              disabled={!selectedMotionId || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Starting..." : "Start Session"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 border rounded-md px-3 bg-card shadow-sm h-10">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input 
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 h-full bg-transparent"
          placeholder="Search motions by text, category, or domain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loadedMotions.map((m) => (
          <Card 
            key={m.id} 
            className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${selectedMotionId === m.id ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedMotionId(m.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base leading-snug">{m.text}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground pb-4">
              <Badge variant="outline">{m.category}</Badge>
              <Badge variant="outline">{m.topic_domain}</Badge>
              <Badge variant="outline">Difficulty {m.difficulty}/5</Badge>
              <Badge variant="outline">{m.format}</Badge>
            </CardContent>
          </Card>
        ))}
        {loadedMotions.length === 0 && !isFetchingMore && (
          <div className="col-span-2 text-center py-12 text-muted-foreground border rounded-md">
            No motions found matching "{searchQuery}".
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={loadMore} disabled={isFetchingMore}>
            {isFetchingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More Motions
          </Button>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
