-- --------------------------------------------------------------------
-- Migration: Disable RLS for testing
-- Created at: 2026-01-26T00:00:00Z UTC
--
-- TEMPORARY: This migration disables RLS entirely for testing.
-- TODO: Re-enable RLS when authentication is implemented
-- --------------------------------------------------------------------

begin;

-- Disable RLS on all tables for testing
alter table public.flashcards disable row level security;
alter table public.generations disable row level security;
alter table public.generation_error_logs disable row level security;

commit;
