# Database Schema Plan

1. Tables

## users
This table is manage by Supabase Auth.

Columns:
- **id**: UUID PRIMARY KEY
- **email**: VARCHAR(255) NOT NULL UNIQUE
- **encrypted_password**: VARCHAR NOT NULL
- **create_at**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **confirmed_at**: TIMESTAMPTZ

## flashcards

Columns:
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- **generation_id**: UUID REFERENCES generations(id) ON DELETE SET NULL
- **front**: VARCHAR(200) NOT NULL
- **back**: VARCHAR(500) NOT NULL
- **source**: TEXT NOT NULL CHECK (source IN ('ai-full', 'ai-edited', 'manual'))
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **updated_at**: TIMESTAMPTZ NOT NULL DEFAULT now()

Constraints:
- UNIQUE (user_id, front)

## generations

Columns:
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- **model**: VARCHAR NOT NULL
- **source_text_hash**: VARCHAR NOT NULL
- **source_text_length**: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- **generated_count**: INTEGER NOT NULL DEFAULT 0
- **accepted_unedited_count**: INTEGER NULLABLE
- **accepted_edited_count**: INTEGER NULLABLE
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **updated_at**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **generation_duration**: INTEGER NOT NULL

## generation_error_logs

Columns:
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- **model**: VARCHAR NOT NULL
- **error_code**: VARCHAR(100) NOT NULL
- **error_message**: TEXT NOT NULL
- **source_text_hash**: VARCHAR NOT NULL
- **source_text_length**: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- **created_at**: TIMESTAMPTZ NOT NULL DEFAULT now()

2. Relationships

- **flashcards.user_id** → **auth.users.id** (1:N)
- **flashcards.generation_id** → **generations.id** (1:N)
- **generations.user_id** → **auth.users.id** (1:N)
- **generation_error_logs.generation_id** → **generations.id** (1:N)
- **generation_error_logs.user_id** → **auth.users.id** (1:N)

3. Indexes

- indeks na kolumnie `user_id` w tabeli flashcards
- indeks na kolumnie `generation_id` w tabeli flashcards
- indeks na kolumnie `user_id` w tabeli generations 
- indeks na kolumnie `user_id` w tabeli generation_error_logs

4. RLS Policies

Enable Row-Level Security on each table:

### flashcards
- **SELECT/UPDATE/DELETE**: USING (user_id = auth.uid())
- **INSERT**: WITH CHECK (user_id = auth.uid())

### generations
- **SELECT/UPDATE/DELETE**: USING (user_id = auth.uid())
- **INSERT**: WITH CHECK (user_id = auth.uid())

### generation_error_logs
- **SELECT/UPDATE/DELETE**: USING (user_id = auth.uid())
- **INSERT**: WITH CHECK (user_id = auth.uid())

5. Additional Notes

- **Triggers**: Create a trigger to update `updated_at` on row modifications for all tables.
- **Partitioning**: Consider partitioning `generation_error_logs` by date in future iterations for scale.
- **Study Sessions**: `study_sessions` table to be designed in later phases.
