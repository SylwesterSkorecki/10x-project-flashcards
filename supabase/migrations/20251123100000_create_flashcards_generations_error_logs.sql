-- --------------------------------------------------------------------
-- Migration: create flashcards, generations, and generation_error_logs
-- Created at: 2025-11-23T10:00:00Z UTC
--
-- This migration:
--   * Defines 'generations', 'flashcards', and 'generation_error_logs' tables
--   * Adds a trigger function to update 'updated_at' on modifications
--   * Enables row-level security (RLS) and creates granular policies for authenticated users
-- --------------------------------------------------------------------

begin;

-- 1. create a trigger function to auto-update 'updated_at' timestamp on row modifications
create or replace function public.set_updated_at_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- 2. create 'generations' table
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 10000),
  generated_count integer not null default 0,
  accepted_unedited_count integer,
  accepted_edited_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generation_duration integer not null
);

-- attach trigger to 'generations' for updating 'updated_at'
create trigger generations_set_updated_at
  before update on public.generations
  for each row execute function public.set_updated_at_timestamp();

-- enable RLS on 'generations'
alter table public.generations enable row level security;

-- policies for 'generations' (authenticated users only)
create policy generations_select_authenticated on public.generations
  for select to authenticated using (user_id = auth.uid());
create policy generations_insert_authenticated on public.generations
  for insert to authenticated with check (user_id = auth.uid());
create policy generations_update_authenticated on public.generations
  for update to authenticated using (user_id = auth.uid());
create policy generations_delete_authenticated on public.generations
  for delete to authenticated using (user_id = auth.uid());

-- 3. create 'flashcards' table
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete set null,
  front varchar(200) not null,
  back varchar(500) not null,
  source text not null check (source in ('ai-full', 'ai-edited', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, front)
);

-- attach trigger to 'flashcards' for updating 'updated_at'
create trigger flashcards_set_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at_timestamp();

-- enable RLS on 'flashcards'
alter table public.flashcards enable row level security;

-- policies for 'flashcards' (authenticated users only)
create policy flashcards_select_authenticated on public.flashcards
  for select to authenticated using (user_id = auth.uid());
create policy flashcards_insert_authenticated on public.flashcards
  for insert to authenticated with check (user_id = auth.uid());
create policy flashcards_update_authenticated on public.flashcards
  for update to authenticated using (user_id = auth.uid());
create policy flashcards_delete_authenticated on public.flashcards
  for delete to authenticated using (user_id = auth.uid());

-- 4. create 'generation_error_logs' table
-- note: this table is append-only (immutable logs), so no 'updated_at' column or trigger is needed
create table public.generation_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar not null,
  error_code varchar(100) not null,
  error_message text not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 10000),
  created_at timestamptz not null default now()
);

-- enable RLS on 'generation_error_logs'
alter table public.generation_error_logs enable row level security;

-- policies for 'generation_error_logs' (authenticated users only)
create policy generation_error_logs_select_authenticated on public.generation_error_logs
  for select to authenticated using (user_id = auth.uid());
create policy generation_error_logs_insert_authenticated on public.generation_error_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy generation_error_logs_update_authenticated on public.generation_error_logs
  for update to authenticated using (user_id = auth.uid());
create policy generation_error_logs_delete_authenticated on public.generation_error_logs
  for delete to authenticated using (user_id = auth.uid());

commit;


