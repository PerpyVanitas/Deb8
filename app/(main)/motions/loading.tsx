import { Skeleton } from "@/components/ui/skeleton"

export default function MotionsLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Motion library</h1>
          <p className="text-sm text-muted-foreground">Pick a motion and role to start a session.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Skeleton className="w-full h-32 rounded-md" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="w-full h-24 rounded-md" />
          ))}
        </div>
      </div>
    </main>
  )
}
