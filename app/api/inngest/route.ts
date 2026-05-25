import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { helloFn, analyzeSessionFn, sweepStuckSessionsFn } from "@/lib/inngest/functions";

console.log('Inngest API route initialized: /api/ingest')

const handler = serve({
  client: inngest,
  functions: [helloFn, analyzeSessionFn, sweepStuckSessionsFn],
});

export const GET = handler as any;
export const POST = handler as any;
export const PUT = handler as any;
