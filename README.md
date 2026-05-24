# Deb8 - The Competitive Debate AI Coach

Deb8 is a high-performance web application tailored for competitive debaters. It leverages the latest AI models (Groq Whisper + Gemini 2.0 Flash) to transcribe, analyze, and provide instantaneous feedback on debate speeches. 

Deb8 supports various international debate formats (British Parliamentary, Asian Parliamentary, 1v1 Sparring) and introduces innovative features like "Hot-Seat" multi-speaker modes and gamified progression paths to ensure continuous improvement.

## 🚀 Features

- **Blazing Fast AI Pipelines**: Transcriptions powered by Groq and evaluations handled by Gemini 2.0 Flash running on background Inngest queues.
- **Multi-Speaker "Hot-Seat"**: Pass a single device around the room. Deb8 will cycle through speakers (e.g. 1st Affirmative -> 1st Negative) and evaluate everyone simultaneously.
- **Debate Prep Utilities**: Digital flow sheets, 15-minute preparation timers, and UI layouts built specifically for competitive standards.
- **Gamification & Leaderboards**: Earn XP per speech, build up daily practice streaks, tackle the "Motion of the Day," and climb the global ranks.
- **Elite Benchmarking**: Compare your stylistic metrics (Logic, Rhetoric, Structure) against elite examples to see where you stand.
- **Client-Side Compression**: Uses WebAssembly (`@ffmpeg/wasm`) to compress heavy `.webm` audio files directly in the browser via Opus codec, saving massive bandwidth before hitting the database.

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router, Edge Runtime)
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **Backend & Auth**: Supabase (Postgres, RLS, Auth)
- **Background Jobs**: Inngest
- **Testing**: Playwright E2E with GitHub Actions CI/CD

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase Project
- Groq API Key
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/deb8.git
   cd deb8
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and fill in your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   GROQ_API_KEY="gsk_..."
   GEMINI_API_KEY="AIza..."
   ```

4. **Database Migration**
   Open your Supabase SQL Editor and run the contents of `setup-db.sql` followed by `full-migration.sql` to initialize the tables, unique constraints, and Row Level Security policies.

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to start practicing!

## 🧪 Testing
We use Playwright for end-to-end testing.
To run the automated test suite locally:
```bash
npx playwright test
```
*Note: Make sure your local server is running, or that Playwright's `webServer` config is uncommented in `playwright.config.ts`.*

## 📖 Architecture & Context
For a deeper dive into the database schema, technical debt, and system architecture, please read `context.md`.
