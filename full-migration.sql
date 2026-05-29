-- ============================================================================
-- FULL MIGRATION SCRIPT (EPIC 1 & EPIC 3)
-- This script safely applies all necessary schema changes for Multi-Speaker
-- support and Gamification features. It is designed to be idempotent (safe 
-- to run multiple times).
-- ============================================================================

-- ==========================================
-- EPIC 1: MULTI-SPEAKER SUPPORT
-- ==========================================

-- 1. Add mode to debate_sessions
ALTER TABLE debate_sessions ADD COLUMN IF NOT EXISTS mode text default 'solo_vs_ai';

-- 2. Add speaker details to transcripts
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS speaker_role text;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS speaker_index int default 0;

-- 3. Add speaker details to analyses
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS speaker_role text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS speaker_index int default 0;

-- 4. Add speaker details to ballots and fact_checks
ALTER TABLE ballots ADD COLUMN IF NOT EXISTS speaker_index int default 0;
ALTER TABLE fact_checks ADD COLUMN IF NOT EXISTS speaker_index int default 0;

-- 5. Drop previous unique constraints on session_id if they exist
-- (This removes the 1:1 limitation, allowing multiple speeches per session)
DO $$
BEGIN
    -- Drop constraints on analyses
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analyses_session_id_key') THEN
        ALTER TABLE analyses DROP CONSTRAINT analyses_session_id_key;
    END IF;
    -- Drop constraints on transcripts
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transcripts_session_id_key') THEN
        ALTER TABLE transcripts DROP CONSTRAINT transcripts_session_id_key;
    END IF;
    -- Drop constraints on ballots
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballots_session_id_key') THEN
        ALTER TABLE ballots DROP CONSTRAINT ballots_session_id_key;
    END IF;
    -- Drop the first multi-speaker fact check constraint if it exists.
    -- Fact checks need one row per claim, not one row per speaker.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fact_checks_session_id_speaker_index_key') THEN
        ALTER TABLE fact_checks DROP CONSTRAINT fact_checks_session_id_speaker_index_key;
    END IF;
END $$;

-- 6. Add new composite unique constraints (session_id, speaker_index)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transcripts_session_id_speaker_index_key') THEN
        ALTER TABLE transcripts ADD UNIQUE (session_id, speaker_index);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analyses_session_id_speaker_index_key') THEN
        ALTER TABLE analyses ADD UNIQUE (session_id, speaker_index);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ballots_session_id_speaker_index_key') THEN
        ALTER TABLE ballots ADD UNIQUE (session_id, speaker_index);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fact_checks_session_id_speaker_index_claim_key') THEN
        ALTER TABLE fact_checks ADD UNIQUE (session_id, speaker_index, claim);
    END IF;
END $$;

-- ==========================================
-- EPIC 3: GAMIFICATION & POLISH
-- ==========================================

-- 1. Profiles Table Updates (XP, Streaks)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp int default 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak int default 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_debate_date date;

-- 2. Motions Table Updates (Motion of the Day)
ALTER TABLE motions ADD COLUMN IF NOT EXISTS is_motion_of_the_day boolean default false;
ALTER TABLE motions ADD COLUMN IF NOT EXISTS motd_date date;

-- Ensure only one motion of the day per date
CREATE UNIQUE INDEX IF NOT EXISTS unique_motd_per_date ON motions (motd_date) WHERE is_motion_of_the_day = true;

-- 3. Fix existing RLS policy errors (safely dropping and recreating)
DROP POLICY IF EXISTS "Users own their profile" ON profiles;
CREATE POLICY "Users own their profile" ON profiles FOR ALL USING (auth.uid() = id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Create the storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('speeches', 'speeches', true) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the speeches bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'speeches');

CREATE POLICY "Allow users to read their own speeches" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'speeches');
