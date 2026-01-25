# REST API Plan

## Overview / Assumptions

- Backend uses Supabase (Postgres + Auth). API will validate Authorization: Bearer <access_token> issued by Supabase.
- Row-level security (RLS) is enforced in DB; API must forward or validate user identity and respect RLS policies.
- AI generation uses Openrouter.ai; generation requests must implement retry + exponential backoff and be logged.
- Validation follows database constraints (e.g. `flashcards.front` ≤ 200, `flashcards.back` ≤ 500, `generations.source_text_length` between 1000 and 10000).
- Pagination default: 20 items per page.

---

## 1. Resources (DB table → API resource)

- users → managed by Supabase Auth (exposed via auth routes / delegated to Supabase SDK)
- flashcards → `/api/flashcards`
- generations → `/api/generations`
- generation_error_logs → `/api/generation-error-logs`
- stats (aggregation endpoints) → `/api/stats`

---

## 2. Endpoints

Common notes:

- All endpoints require Authorization header with Bearer token except auth endpoints which delegate to Supabase.
- All request and response bodies are JSON.
- Error format (JSON):
  {
  "error": {
  "code": "string",
  "message": "string",
  "details": {}
  }
  }

### Auth (delegated to Supabase)

- POST /api/auth/signup
  - Description: Proxy to Supabase sign-up (email + password). Supabase handles verification email.
  - Body: { "email": "string", "password": "string" }
  - Success: 201 Created (Supabase response)
  - Errors: 400 invalid, 409 already exists

- POST /api/auth/login
  - Description: Proxy to Supabase sign-in, returns access token
  - Body: { "email": "string", "password": "string" }
  - Success: 200 { "access_token": "...", "user": { ... } }

- POST /api/auth/password-reset
  - Description: Delegates to Supabase to send reset email
  - Body: { "email": "string" }

### Flashcards

- GET /api/flashcards
  - Description: List user's flashcards with search, pagination, sorting
  - Query params:
    - page (integer, default 1)
    - per_page (integer, default 20, max 100)
    - q (string) — search term applied to `front` and `back` (ILIKE '%q%')
    - sort_by (string) — one of `created_at`, `updated_at`, `front`
    - sort_order (string) — `asc` or `desc`
  - Response:
    {
    "items": [ { "id", "front", "back", "source", "generation_id", "created_at", "updated_at" } ],
    "total": integer,
    "page": integer,
    "per_page": integer
    }
  - Success: 200
  - Errors: 401 unauthorized

- POST /api/flashcards
  - Description: Create a single flashcard (manual or saving an accepted candidate)
  - Body:
    {
    "front": "string (≤200)",
    "back": "string (≤500)",
    "source": "ai-full|ai-edited|manual",
    "generation_id": "uuid|null"
    }
  - Server-side validations:
    - front length ≤ 200 and non-empty
    - back length ≤ 500 and non-empty
    - unique constraint (user_id, front) enforced before insert (return 409 if duplicate)
  - Response: 201 { "id", "front", "back", "source", "generation_id", "created_at" }
  - Errors: 400 validation, 409 conflict, 401

- POST /api/flashcards/bulk
  - Description: Save multiple accepted flashcards at once (used after generation review)
  - Body:
    {
    "generation_id": "uuid|null",
    "cards": [ { "front", "back", "source" } ]
    }
  - Behavior:
    - Validate each card; skip duplicates; return per-card status
    - Transactional per-request: successful inserts committed, duplicates reported
  - Response:
    {
    "saved": [ { "id", "front" } ],
    "skipped": [ { "front", "reason" } ]
    }
  - Success: 200
  - Errors: 400, 401

- GET /api/flashcards/{id}
  - Description: Get single flashcard (must belong to user)
  - Response: 200 { "id", "front", "back", "source", "generation_id", "created_at", "updated_at" }
  - Errors: 404 not found, 403 forbidden, 401

- PUT /api/flashcards/{id}
  - Description: Update front/back/source
  - Body: { "front"?: string, "back"?: string }
  - Validations: same length limits; unique front per user enforced
  - Response: 200 updated resource
  - Errors: 400, 403, 404

- DELETE /api/flashcards/{id}
  - Description: Delete a flashcard (client confirms)
  - Response: 204 No Content
  - Errors: 403, 404, 401

### Generations (AI)

Notes: generation creates candidate flashcards from input text. API must log generation and metrics.

- POST /api/generations
  - Description: Request AI generation from source text. Synchronous attempt with background fallback.
  - Body:
    {
    "source_text": "string",
    "model": "string (optional)",
    "max_candidates": integer (optional, default 10),
    "timeout_seconds": integer (optional, default 25)
    }
  - Server behavior:
    - Validate source_text length: must be between 1000 and 10000 characters (DB constraint). If outside range return 400.
    - Create a `generations` row with status metadata (generated_count default 0) and start generation.
    - Attempt a synchronous call to Openrouter.ai with overall SLA < 30s. If results returned within timeout_seconds, return 200 with candidates and update generation row (generated_count, generation_duration).
    - If external call doesn't return within timeout_seconds or is queued, return 202 Accepted with { "generation_id": uuid, "status": "pending" } and finish processing in background (webhook/worker).
    - On error, create a `generation_error_logs` entry and return 503 with retry guidance.
  - Response (200 synchronous):
    {
    "generation_id": "uuid",
    "model": "string",
    "generated_count": integer,
    "candidates": [
    { "candidate_id": "string", "front": "string", "back": "string", "score": number }
    ],
    "duration_ms": integer
    }
  - Response (202 async):
    { "generation_id": "uuid", "status": "pending" }
  - Errors: 400 validation, 401, 503 external API failure

- GET /api/generations/{id}
  - Description: Get generation metadata and candidates if available
  - Response:
    {
    "id", "user_id", "model", "source_text_length", "generated_count", "accepted_unedited_count", "accepted_edited_count", "created_at", "updated_at",
    "candidates": [ { "candidate_id", "front", "back", "score", "status" } ] // when available
    }
  - Errors: 403, 404

- POST /api/generations/{id}/commit
  - Description: Persist accepted candidate(s) to `flashcards` (bulk save)
  - Body:
    {
    "accepted": [ { "candidate_id", "front", "back", "source": "ai-full|ai-edited" } ]
    }
  - Behavior: validates and inserts via /api/flashcards/bulk, updates `generations.accepted_*_count`
  - Response: 200 { "saved": [...], "skipped": [...] }

### Generation Error Logs

- GET /api/generation-error-logs
  - Description: List generation errors for the authenticated user (pagination)
  - Query: page, per_page
  - Response: paginated list of errors { id, model, error_code, error_message, source_text_length, created_at }

- POST /api/generation-error-logs
  - Description: Internal endpoint used by workers to persist error logs (should be protected)
  - Body: { "model", "error_code", "error_message", "source_text_hash", "source_text_length", "generation_id" }
  - Response: 201

### Stats / Metrics

- GET /api/stats/generations
  - Description: Aggregated metrics for the authenticated user
  - Query params: from, to (ISO date strings)
  - Response:
    {
    "total_generations": integer,
    "total_generated_cards": integer,
    "accepted_unedited": integer,
    "accepted_edited": integer,
    "acceptance_rate": number
    }

---

## 3. Authentication & Authorization

- Use Supabase Auth (JWT). API validates Authorization: Bearer <token> and extracts user id (sub).
- RLS in database enforces row ownership; the API should still perform server-side checks (user_id matches token) for defense in depth.
- Role model: `user` (regular). Admin routes are not in MVP.
- For sensitive actions (account deletion), re-authenticate by requiring current password via Supabase re-auth flow.
- CORS: restrict to the web client origins.
- Rate limiting:
  - Per-user: e.g., 60 requests/min baseline (tunable)
  - Generation-specific throttling: e.g., max 6 generation attempts per minute, to protect external API usage.
- Input sanitization: escape/parameterize SQL queries; strip control characters in text fields.
- Logging: do not store full plaintext of personal sensitive information beyond what DB requires; mask tokens in logs.

---

## 4. Validation & Business Logic

Validation rules (enforced server-side and mirrored client-side):

- flashcards.front: required, string, length 1–200
- flashcards.back: required, string, length 1–500
- flashcards.source: enum ['ai-full','ai-edited','manual']
- generations.source_text_length: integer between 1000 and 10000 (DB CHECK). Requests outside range => 400
- generations.model: non-empty string
- Unique constraint: (user_id, front) — attempts to create duplicates return 409 with {"error":{ "code":"duplicate_front", "message":"Flashcard with same front already exists." }}

Business logic mapping:

- Generate candidates:
  - Endpoint: POST /api/generations
  - Behavior: synchronous attempt then background fallback. Log start time, end time, generated_count, duration. On failure create generation_error_logs and return readable error with retry instructions. Implement retry/backoff when communicating with Openrouter.ai.

- Review / Accept / Edit / Reject:
  - UI collects accept/edit/reject per candidate.
  - Commit accepted via /api/generations/{id}/commit or /api/flashcards/bulk.
  - Rejected candidates are not stored; API does not persist them.

- Saving accepted cards:
  - Enforce uniqueness and per-card validation.
  - Update generation counters: `accepted_unedited_count` when saved without edits, `accepted_edited_count` when saved after edits.

- Deletion of user account:
  - Use Supabase account delete which cascades due to foreign key ON DELETE CASCADE; API should require password re-confirmation then call Supabase delete.

Performance & scaling considerations:

- Use DB indexes on `flashcards.user_id`, `flashcards.generation_id`, `generations.user_id`, `generation_error_logs.user_id` (already planned).
- Consider partitioning `generation_error_logs` by date when high volume.
- Use background worker (queue) for long-running generation operations and for retry/backoff strategy.
- Cache frequently-read paginated pages if necessary (CDN or in-memory).

Security considerations:

- Enforce HTTPS, validate JWTs, implement rate limiting and per-user quotas for generation to control costs.
- Store API keys for Openrouter.ai in secure secrets manager.
- Ensure GDPR requirements: implement endpoints for data export and account/data deletion (account deletion already cascades).

---

## 5. Example Request / Response snippets

Create generation (sync success):

Request:
{
"source_text": "....",
"model": "gpt-4-like",
"max_candidates": 8
}

Response 200:
{
"generation_id": "uuid",
"model": "gpt-4-like",
"generated_count": 5,
"candidates": [
{ "candidate_id":"c1", "front":"Q1", "back":"A1", "score":0.92 },
...
],
"duration_ms": 1234
}

Save accepted candidates (bulk):
Request POST /api/flashcards/bulk
{
"generation_id":"uuid",
"cards": [ { "front":"Q1","back":"A1","source":"ai-full" } ]
}

Response 200:
{
"saved":[{"id":"...","front":"Q1"}],
"skipped":[]
}

---

## 6. Implementation Notes / Next Steps

- Implement background worker for async generation processing and retries (recommended using Supabase Edge Functions or an external worker).
- Use Supabase client for DB access and respect RLS (pass JWT to Supabase client where possible).
- Implement request-level instrumentation: log generation times, counts, error rates for metrics described in PRD.
- Add unit/integration tests around: validation rules, unique constraint handling, generation flow (sync and async), retry/backoff.

End of plan.
