-- Enable pgvector
create extension if not exists vector;

-- PHASE 0: Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  debate_dna jsonb default '{}',
  total_speeches int default 0,
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
  format text default 'BP'
);

create table if not exists debate_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  motion_id uuid references motions(id),
  role text not null,   -- 'PM' | 'LO' | 'DPM' etc
  format text default 'BP',
  status text default 'pending',
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
  session_id uuid references debate_sessions(id) on delete cascade unique,
  raw_text text not null,
  word_count int,
  duration_seconds int,
  segments jsonb,   -- [{start, end, text}]
  created_at timestamptz default now()
);

alter table transcripts enable row level security;
create policy "Users own their transcripts"
  on transcripts for all
  using (auth.uid() = (select user_id from debate_sessions where id = session_id));


-- PHASE 4: Analyses
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade unique,
  scores jsonb not null,       -- {structure, logic, rhetoric, rebuttal, weighing, overall}
  structural_segments jsonb,   -- labeled speech segments
  arguments jsonb,             -- extracted claims and arguments
  tone text,
  archetype text,
  coaching jsonb,              -- {strengths[], weaknesses[], drills[], improvements[]}
  rfd_summary text,
  created_at timestamptz default now()
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


-- PHASE 6: Ballots
create table if not exists ballots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references debate_sessions(id) on delete cascade unique,
  speaker_score int,
  ranking text,
  rfd text,
  clash_evaluation jsonb,
  judge_persona text default 'technical',
  created_at timestamptz default now()
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
  claim text not null,
  verdict text,
  confidence int,
  explanation text,
  sources jsonb,
  created_at timestamptz default now()
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
