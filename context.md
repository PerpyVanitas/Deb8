# Deb8 Project Context & Architecture

This file is a living document that tracks the state, architecture, and current goals of the Deb8 application. It serves as the primary technical onboarding document for any AI assistants or developers working on the repository.

- **Fast and Focused**: Optimize for sub-2-second TTS generation. If it feels slow, it's broken.
- **Strict Constraints**: DO NOT implement any features requiring camera interaction or video recording. The platform is strictly audio and text-based.

## Tech Stack

---

## 1. Project Overview
**Deb8** is a high-performance web application designed for competitive debaters. It allows users to record speeches, receive instantaneous AI-driven analysis, and track their debate progression over time. 

The application is built to handle complex debate formats such as BP (British Parliamentary), Asian Parliamentary, and 1v1 Sparring, natively supporting multi-speaker sessions on a single device through a "hot-seat" UI flow.

### Core Technologies
- **Framework**: Next.js 15+ (App Router)
- **Styling**: TailwindCSS, Shadcn UI, Framer Motion
- **Database & Auth**: Supabase (Postgres, Row Level Security, Auth, Storage)
- **Background Jobs**: Inngest (Handles long-running Gemini API evaluations asynchronously)
- **AI Pipelines**:
  - *Transcription*: Groq Whisper-Large-V3 (Fastest available STT)
  - *Analysis*: Gemini 2.0 Flash (Lightning fast reasoning, low cost)
- **Client Processing**: `@ffmpeg/wasm` for client-side `.webm` audio compression (Opus codec)

---

## 2. Completed Epics & Features

### Core V2 Stable Release
- Migrated from legacy React to Next.js 15 App Router.
- Implemented Groq for transcription and Gemini for analysis.
- Offloaded heavy API polling to Inngest background queues to prevent Vercel serverless timeouts.

### Epic 1: Multi-Speaker "Hot-Seat" Mode
- **Refactored Schema**: Dropped 1:1 constraints to allow multiple transcripts, analyses, and ballots per `session_id`.
- **Pass-and-Play UI**: The Recording engine loops based on format (e.g., 6 speeches for 3v3).
- **Parallel Analysis**: `inngest/functions.ts` uses `Promise.all` to spin up concurrent Gemini jobs for each speaker.
- **Tabbed Dashboard**: `AnalysisPage` renders individual feedback for each speaker via tabs.

### Epic 2: Automated E2E Testing
- Initialized Playwright testing framework (`tests/auth.spec.ts`).
- Created a GitHub Actions CI/CD workflow (`playwright.yml`) to automatically test Vercel preview environments before merging.
- [x] Epic 4: 1v1 Arena & Agentic Opponent (Completed)
- [x] Epic 5: The UI/UX Polish & Resilience (Completed)
- [x] Epic 6: The Elite Debate Coach & Drills (Completed)
- [ ] Epic 7: Performance & Infrastructure scaling

### Epic 3: Gamification & Polish
- **Framer Motion**: Global `template.tsx` adds cross-page slide/fade animations.
- **Gamification Engine**: `updateSkills.ts` tracks daily streaks, total speeches, and awards XP.
- **Dashboard Upgrade**: Showcases Streaks, XP, and fetches a daily "Motion of the Day" challenge.
- **The Prep Room**: The `/sessions/[id]/record` route features a 15-minute Prep Timer and a local Digital Flow Sheet (scratchpad) for debaters.

### Epic 4: Backend Scale & Stability
- **Audio Compression**: Client-side `@ffmpeg/wasm` Web Worker shrinks audio files down using 32kbps Opus before Supabase upload.
- **Realtime UI**: `AnalysisLoader` uses Supabase Realtime (`postgres_changes`) to instantly push dashboard updates when Inngest finishes, eliminating HTTP polling.
- **Edge Runtime**: High-traffic routes like `/leaderboard` and `/dashboard` utilize Next.js Edge Runtime for instantaneous delivery. `user_skills` handles complex ranking queries natively.

---

## 3. Database Schema (Supabase)

The full, idempotent schema migration script can be found in `full-migration.sql`.

- **`profiles`**: Links to `auth.users`. Tracks `display_name`, `is_admin`, `xp`, `current_streak`, `last_debate_date`, and `total_speeches`.
- **`motions`**: Debate topics. Tracks `text`, `category`, `difficulty`, `format`. Includes `is_motion_of_the_day` logic.
- **`debate_sessions`**: The core pivot table. Tracks `user_id`, `motion_id`, `format`, `mode` (e.g., `human_vs_human_3v3`), and `status` (pending/transcribing/analyzing/analyzed).
- **`transcripts`**: Audio text. Includes `speaker_index` and `speaker_role`. Unique constraint on `(session_id, speaker_index)`.
- **`analyses`**: Gemini's structural and stylistic feedback. Unique constraint on `(session_id, speaker_index)`.
- **`ballots`**: The overall judge decision/RFD (Reason for Decision). Unique constraint on `(session_id, speaker_index)`.
- **`fact_checks`**: Hallucination catching for claims. Unique constraint on `(session_id, speaker_index)`.
- **`skill_snapshots` & `user_skills`**: Tracks rolling averages of user metrics (Logic, Rhetoric, Structure) for progression trees and global leaderboards.

---

## 4. Environment Variables Required
```env
# Next.js / Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# AI Providers
GROQ_API_KEY="gsk_..."
GEMINI_API_KEY="AIza..."

# Background Queues
INNGEST_EVENT_KEY="local"
INNGEST_SIGNING_KEY="local"
```

## 5. Design Philosophy
- **NO CAMERA/VIDEO TRACKING**: Under absolutely no circumstances should any feature involving webcams, video recording, or camera-based body-language tracking be implemented. The app is strictly audio and text-based.
- **Aesthetics First**: Vibrant, modern UI/UX with smooth transitions and premium typography.
- **Speed**: Heavy workloads (transcription/AI) are pushed to background queues (Inngest) or Edge networks. Client-side blocking operations must use Web Workers (FFmpeg).
- **Graceful Degradation**: Always provide loaders, skeletons, and error fallbacks.
