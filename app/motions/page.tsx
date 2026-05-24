import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { MotionSelector } from "@/features/motion/MotionSelector"

import { getMotions } from "./actions"

export default async function MotionsPage() {
  const motions = await getMotions(0)

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Motion library</h1>
          <p className="text-sm text-muted-foreground">Pick a motion and role to start a session.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
      </div>

      <MotionSelector motions={motions || []} />
    </main>
  )
}
