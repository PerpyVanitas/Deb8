import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Deb8
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-6 py-24">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          AI-powered debate training
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Train smarter. Argue sharper. Win more rounds.
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Practice British Parliamentary, World Schools, and Policy debate with an AI judge that gives you transcripts,
          structural analysis, fact-checks, and personalized coaching after every speech.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/auth/sign-up"}>Start a session</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/motions">Browse motions</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
