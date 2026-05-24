-- Enable pgvector
create extension if not exists vector;

-- PHASE 0: Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  debate_dna jsonb default '{}',
  total_speeches int default 0,
  xp int default 0,
  current_streak int default 0,
  last_debate_date date,
  created_at timestamptz default now(),
  is_admin boolean not null default false
);

alter table profiles enable row level security;
create policy "Users own their profile"
  on profiles for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        create trigger on_auth_user_created
          after insert on auth.users
          for each row execute procedure public.handle_new_user();
    END IF;
END $$;


-- PHASE 1: Motions and Sessions
create table if not exists motions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,      -- 'policy' | 'value' | 'fact'
  difficulty int,     -- 1-5
  topic_domain text,  -- 'education' | 'tech' | 'politics' etc
  format text default 'BP',
  is_motion_of_the_day boolean default false,
  motd_date date
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_motd_per_date ON motions (motd_date) WHERE is_motion_of_the_day = true;

create table if not exists debate_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  motion_id uuid references motions(id),
  role text not null,   -- 'PM' | 'LO' | 'DPM' etc
  format text default 'BP',
  status text default 'pending',
  mode text default 'solo_vs_ai',
  created_at timestamptz default now()
);

alter table debate_sessions enable row level security;
create policy "Users own their sessions"
  on debate_sessions for all using (auth.uid() = user_id);

-- Seed Motions
insert into motions (text, category, difficulty, topic_domain) values
  ('THW abolish standardized testing', 'policy', 2, 'education'),
  ('THBT AI will replace teachers', 'value', 3, 'technology'),
  ('THBT social media causes more harm than good', 'value', 2, 'technology'),
  ('THW implement universal basic income', 'policy', 3, 'economics'),
  ('THBT democracies should ban political advertising', 'policy', 4, 'politics')
ON CONFLICT DO NOTHING;


-- PHASE 3: Transcripts
create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade,
  speaker_role text,
  speaker_index int default 0,
  raw_text text not null,
  word_count int,
  duration_seconds int,
  segments jsonb,   -- [{start, end, text}]
  created_at timestamptz default now(),
  unique (session_id, speaker_index)
);

alter table transcripts enable row level security;
create policy "Users own their transcripts"
  on transcripts for all
  using (auth.uid() = (select user_id from debate_sessions where id = session_id));


-- PHASE 4: Analyses
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade,
  speaker_role text,
  speaker_index int default 0,
  scores jsonb not null,
  structural_segments jsonb,
  arguments jsonb,
  tone text,
  archetype text,
  coaching jsonb,
  rfd_summary text,
  created_at timestamptz default now(),
  unique (session_id, speaker_index)
);

alter table analyses enable row level security;
create policy "Users own their analyses"
  on analyses for all
  using (auth.uid() = (select user_id from debate_sessions where id = session_id));

-- PHASE 5: Admin Audit Logs
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table admin_audit_logs enable row level security;
-- Only admins can read/write
create policy "Admins can access audit logs"
  on admin_audit_logs for all
  using ((select is_admin from profiles where id = auth.uid()) = true);


-- PHASE 5: Relational Skills and Leaderboard
create table if not exists user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  skill_name text not null check (skill_name in ('structure', 'logic', 'rhetoric', 'rebuttal', 'weighing', 'overall')),
  score numeric not null default 0,
  updated_at timestamptz default now(),
  unique (user_id, skill_name)
);

alter table user_skills enable row level security;
-- Leaderboards need public read access to skills
create policy "Anyone can read user_skills" on user_skills for select using (true);
create policy "Users can update their own user_skills" on user_skills for update using (auth.uid() = user_id);
create policy "Users can insert their own user_skills" on user_skills for insert with check (auth.uid() = user_id);

/* 
-- RUN THIS MANUALLY IN SUPABASE SQL EDITOR TO MIGRATE EXISTING JSONB DATA
insert into user_skills (user_id, skill_name, score)
select 
  p.id,
  skill.key,
  (p.debate_dna->>skill.key)::numeric
from profiles p
cross join jsonb_object_keys(p.debate_dna) as skill(key)
where p.debate_dna is not null and p.debate_dna != '{}'
on conflict (user_id, skill_name) do update 
set score = excluded.score, updated_at = now();
*/


-- PHASE 6: Ballots
create table if not exists ballots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade,
  speaker_score int,
  ranking text,
  rfd text,
  clash_evaluation jsonb,
  judge_persona text default 'technical',
  created_at timestamptz default now(),
  unique (session_id, speaker_index)
);

alter table ballots enable row level security;
create policy "Users own their ballots"
  on ballots for all
  using (auth.uid() = (select user_id from debate_sessions where id = session_id));


-- PHASE 7: Elite Examples
create table if not exists elite_examples (
  id uuid primary key default gen_random_uuid(),
  debater_name text,
  motion text,
  role text,
  segment_type text,
  content text,
  embedding vector(768),
  metadata jsonb,
  created_at timestamptz default now()
);

alter table elite_examples enable row level security;
-- Anyone can read, only admins can write
create policy "Anyone can read elite examples"
  on elite_examples for select
  using (true);
create policy "Admins can insert elite examples"
  on elite_examples for insert
  with check ((select is_admin from profiles where id = auth.uid()) = true);


-- PHASE 8: Fact Checks
create table if not exists fact_checks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade,
  speaker_index int default 0,
  claim text not null,
  verdict text,
  confidence int,
  explanation text,
  sources jsonb,
  created_at timestamptz default now(),
  unique (session_id, speaker_index)
);

alter table fact_checks enable row level security;
create policy "Users own their fact checks"
  on fact_checks for all
  using (auth.uid() = (select user_id from debate_sessions where id = session_id));

-- PHASE 7: Benchmarking additions
alter table analyses add column if not exists elite_benchmark jsonb;

create index if not exists elite_examples_embedding_idx on elite_examples
  using hnsw (embedding vector_cosine_ops);

create or replace function match_elite_examples (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (id uuid, debater_name text, content text, segment_type text, similarity float)
language sql stable as $$
  select id, debater_name, content, segment_type,
         1 - (embedding <=> query_embedding) as similarity
  from elite_examples
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- PHASE 8: Debate DNA & Progression
create table if not exists skill_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_id uuid references debate_sessions(id),
  scores jsonb,       -- same shape as analyses.scores
  dna_delta jsonb,    -- what changed in debate DNA this session
  created_at timestamptz default now()
);

alter table skill_snapshots enable row level security;
create policy "Users own their skill snapshots"
  on skill_snapshots for all
  using (auth.uid() = user_id);

-- PHASE 9: 1v1 Arena State Persistence
create table if not exists arena_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  text text not null,
  created_at timestamptz default now()
);

alter table arena_turns enable row level security;
create policy "Users own their arena turns"
  on arena_turns for all
  using (
    exists (
      select 1 from debate_sessions ds
      where ds.id = arena_turns.session_id
      and ds.user_id = auth.uid()
    )
  );
