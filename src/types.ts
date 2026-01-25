// DTO and Command Model definitions for API
// These types are intentionally derived from DB types in src/db/database.types.ts
// to keep DTOs aligned with the underlying schema.
import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// --- DB row / helper aliases (for clarity) ---
type FlashcardRow = Tables<"flashcards">;
// Reserved for future use in create/update operations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FlashcardInsert = TablesInsert<"flashcards">;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type FlashcardUpdate = TablesUpdate<"flashcards">;

type GenerationRow = Tables<"generations">;
// Reserved for future use in create/update operations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type GenerationInsert = TablesInsert<"generations">;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type GenerationUpdate = TablesUpdate<"generations">;

type GenerationErrorLogRow = Tables<"generation_error_logs">;
type GenerationErrorLogInsert = TablesInsert<"generation_error_logs">;

// --- Auth DTOs / Commands (delegated to Supabase) ---
export interface AuthSignUpCommand {
  email: string;
  password: string;
}

export interface AuthLoginCommand {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  access_token: string;
  // Supabase user shape varies; use unknown here or refine when needed.
  user: unknown;
}

export interface PasswordResetCommand {
  email: string;
}

// --- API Error types ---
export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "duplicate_front"
  | "duplicate_source"
  | "internal_error";

export interface ApiError {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// --- Flashcards ---
// Public-facing flashcard shape returned by API (derived from DB row)
export type FlashcardDTO = Pick<
  FlashcardRow,
  "id" | "front" | "back" | "source" | "generation_id" | "created_at" | "updated_at"
>;

// Source enum for flashcards (explicit to match API validation)
export type FlashcardSource = "ai-full" | "ai-edited" | "manual";

// Command to create a single flashcard (client request body).
// We pick only fields the client sends; server will set user_id, id, timestamps.
export interface CreateFlashcardCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: string | null;
}

// Single card item for bulk creates (no user_id/id/timestamps)
export interface BulkCreateCardItem {
  front: string;
  back: string;
  source: FlashcardSource;
}

// Bulk create request: optional generation_id (applies to many saved cards) plus cards
export interface BulkCreateFlashcardsCommand {
  generation_id?: string | null;
  cards: BulkCreateCardItem[];
}

// Bulk operation result: saved rows (id+front) and skipped (front + reason)
export interface BulkSaveResult {
  saved: Pick<FlashcardRow, "id" | "front">[];
  skipped: { front: string; reason: string }[];
}

// Update command for a flashcard (partial update allowed)
export type UpdateFlashcardCommand = Partial<{
  front: string;
  back: string;
  source: FlashcardSource;
}>;

// Paginated list response for flashcards
export interface PaginatedFlashcardsResponse {
  items: FlashcardDTO[];
  total: number;
  page: number;
  per_page: number;
}

// --- Generations (AI) ---
// Candidate produced by generation (ephemeral, not a DB table)
export interface GenerationCandidate {
  candidate_id: string;
  front: string;
  back: string;
  score: number;
  // optional status when available (e.g., 'pending'|'accepted'|'rejected' etc.)
  status?: string;
}

// Request to start a generation. This shape is API-level and not a DB insert.
export interface CreateGenerationCommand {
  source_text: string;
  model?: string;
  max_candidates?: number;
  timeout_seconds?: number;
}

// Synchronous success response when generation returns immediately
export interface CreateGenerationResponseSync {
  generation_id: string;
  model: string;
  generated_count: number;
  candidates: GenerationCandidate[];
  duration_ms: number;
}

// Asynchronous accepted response
export interface CreateGenerationResponseAsync {
  generation_id: string;
  status: "pending";
}

// Public-facing generation record (derived from DB Row) with optional candidates
export type GenerationDTO = Pick<
  GenerationRow,
  | "id"
  | "user_id"
  | "model"
  | "source_text_length"
  | "generated_count"
  | "accepted_unedited_count"
  | "accepted_edited_count"
  | "created_at"
  | "updated_at"
> & {
  candidates?: GenerationCandidate[];
};

// Commit accepted candidates -> saved as flashcards (POST /api/generations/{id}/commit)
export interface CommitAcceptedCandidate {
  candidate_id: string;
  front: string;
  back: string;
  source: "ai-full" | "ai-edited";
}

export interface CommitGenerationCommand {
  accepted: CommitAcceptedCandidate[];
}

// --- Generation error logs ---
// Public-facing error log entry (derived from DB row)
export type GenerationErrorLogDTO = Pick<
  GenerationErrorLogRow,
  "id" | "model" | "error_code" | "error_message" | "source_text_length" | "created_at"
>;

// Internal command used by workers to persist an error log.
// Note: DB Insert requires user_id; workers or server should set user_id server-side.
export type CreateGenerationErrorLogCommand = Pick<
  GenerationErrorLogInsert,
  "model" | "error_code" | "error_message" | "source_text_hash" | "source_text_length"
> & {
  generation_id?: string;
};

// Paginated list response for generation error logs
export interface PaginatedGenerationErrorLogsResponse {
  items: GenerationErrorLogDTO[];
  total: number;
  page: number;
  per_page: number;
}

// --- Stats / Metrics ---
export interface GenerationsStatsResponse {
  total_generations: number;
  total_generated_cards: number;
  accepted_unedited: number;
  accepted_edited: number;
  acceptance_rate: number;
}

// --- Notes ---
// - Most DTOs that reflect DB rows are implemented with Pick<> from the DB Row types
//   (Tables<...>, TablesInsert<...>, TablesUpdate<...>) so changes to DB types
//   propagate to DTOs where appropriate.
// - Command types intentionally omit server-managed fields (user_id, id, timestamps).
// - Use Partial<...> for update commands to allow partial updates.
