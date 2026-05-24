'use client'

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-sm">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">Critical System Error</h1>
            <p className="text-base text-muted-foreground">
              A fatal error occurred that crashed the application layout. Our engineering team has been notified via Sentry.
            </p>
          </div>
          <div className="flex w-full flex-col sm:flex-row gap-3 mt-4">
            <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
              Reload Page
            </Button>
            <Button onClick={() => reset()} className="flex-1">
              Attempt Recovery
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
