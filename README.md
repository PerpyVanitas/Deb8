# Deb8 - The Competitive Debate AI Coach

Deb8 is a focused solo debate-practice app. It records a speech, transcribes it with Groq Whisper, and runs paced Gemini analysis stages through Inngest so the most important feedback appears first.

## Features

- **Staged AI pipeline**: Core scorecard and ballot save first, followed by arguments, fact checks, coaching drills, and benchmarking.
- **Solo recording flow**: One active user records one speech at a time, then moves directly into analysis.
- **Transcript preservation**: The original transcript remains visible even if AI analysis has to be retried.
- **Progress tracking**: XP, streaks, recent sessions, and Debate DNA are kept for the signed-in user.
- **Client-side compression**: WebAssembly audio compression reduces upload size before storage and transcription.

## Technology Stack

- **Frontend**: Next.js App Router
- **Styling**: Tailwind CSS and Shadcn UI
- **Backend & Auth**: Supabase
- **Background Jobs**: Inngest
- **AI**: Groq Whisper for transcription, Gemini for analysis
- **Testing**: Playwright

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   GROQ_API_KEY="gsk_..."
   GEMINI_API_KEY="AIza..."
   ```

3. Run the database migration in Supabase SQL Editor:
   ```text
   full-migration.sql
   ```

4. Start the app:
   ```bash
   pnpm run dev
   ```

## Testing

```bash
pnpm exec playwright test
```

## Architecture

See `context.md` for the current schema and pipeline notes.
