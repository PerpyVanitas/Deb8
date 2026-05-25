import { Sidebar } from "@/components/layout/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}
