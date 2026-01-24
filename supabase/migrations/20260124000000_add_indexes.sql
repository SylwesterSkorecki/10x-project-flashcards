-- --------------------------------------------------------------------
-- Migration: add indexes for performance optimization
-- Created at: 2026-01-24T00:00:00Z UTC
--
-- This migration:
--   * Adds indexes on user_id columns for efficient user-scoped queries
--   * Adds index on generation_id in flashcards for efficient joins
--
-- These indexes will improve query performance for:
--   - Filtering flashcards, generations, and error logs by user
--   - Joining flashcards with their generation records
-- --------------------------------------------------------------------

begin;

-- add index on flashcards.user_id for efficient user-scoped queries
-- this index will speed up RLS policy checks and user-specific flashcard retrieval
create index idx_flashcards_user_id on public.flashcards(user_id);

-- add index on flashcards.generation_id for efficient joins with generations table
-- this index will speed up queries that join flashcards with their generation metadata
create index idx_flashcards_generation_id on public.flashcards(generation_id);

-- add index on generations.user_id for efficient user-scoped queries
-- this index will speed up RLS policy checks and user-specific generation retrieval
create index idx_generations_user_id on public.generations(user_id);

-- add index on generation_error_logs.user_id for efficient user-scoped queries
-- this index will speed up RLS policy checks and user-specific error log retrieval
create index idx_generation_error_logs_user_id on public.generation_error_logs(user_id);

commit;
