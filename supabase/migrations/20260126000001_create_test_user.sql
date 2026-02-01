-- --------------------------------------------------------------------
-- Migration: Create test user for development/testing
-- Created at: 2026-01-26T00:00:01Z UTC
--
-- TEMPORARY: This migration creates a test user for development.
-- TODO: Remove this when authentication is implemented
-- --------------------------------------------------------------------

begin;

-- Create test user in auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test@example.com',
  '$2a$10$fakehashedpasswordthatdoesntmatter',
  now(),
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
  null,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Test User"}'::jsonb,
  false,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

commit;
