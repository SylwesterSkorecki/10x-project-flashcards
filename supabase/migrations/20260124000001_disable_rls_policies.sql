-- --------------------------------------------------------------------
-- Migration: disable all RLS policies on flashcards, generations, and generation_error_logs
-- Created at: 2026-01-24T00:00:01Z UTC
--
-- This migration:
--   * Drops all RLS policies from flashcards table
--   * Drops all RLS policies from generations table
--   * Drops all RLS policies from generation_error_logs table
--
-- Note: Row Level Security remains ENABLED on these tables, but without
-- policies, only service role will have access. This is useful for
-- server-side operations or when implementing custom authorization logic.
-- --------------------------------------------------------------------

begin;

-- drop all policies from 'flashcards' table
drop policy if exists flashcards_select_authenticated on public.flashcards;
drop policy if exists flashcards_insert_authenticated on public.flashcards;
drop policy if exists flashcards_update_authenticated on public.flashcards;
drop policy if exists flashcards_delete_authenticated on public.flashcards;

-- drop all policies from 'generations' table
drop policy if exists generations_select_authenticated on public.generations;
drop policy if exists generations_insert_authenticated on public.generations;
drop policy if exists generations_update_authenticated on public.generations;
drop policy if exists generations_delete_authenticated on public.generations;

-- drop all policies from 'generation_error_logs' table
drop policy if exists generation_error_logs_select_authenticated on public.generation_error_logs;
drop policy if exists generation_error_logs_insert_authenticated on public.generation_error_logs;
drop policy if exists generation_error_logs_update_authenticated on public.generation_error_logs;
drop policy if exists generation_error_logs_delete_authenticated on public.generation_error_logs;

commit;
