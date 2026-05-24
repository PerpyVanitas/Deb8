import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="mb-8">
        <Skeleton className="w-full h-80 rounded-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="w-full h-40 rounded-xl" />
        <Skeleton className="w-full h-40 rounded-xl" />
      </div>
    </main>
  )
}
