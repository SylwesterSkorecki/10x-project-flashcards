/**
 * JSON Schema definitions for flashcard generation with OpenRouter
 *
 * These schemas define the expected structure of responses from the AI model
 * when generating flashcards from source text.
 */

import type { ResponseFormat } from "../services/openrouter.service";

/**
 * JSON Schema for a single flashcard candidate
 */
export const FLASHCARD_CANDIDATE_SCHEMA = {
  type: "object",
  required: ["front", "back", "score"],
  properties: {
    front: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description: "The question or front side of the flashcard",
    },
    back: {
      type: "string",
      minLength: 1,
      maxLength: 500,
      description: "The answer or back side of the flashcard",
    },
    score: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Quality score of the flashcard (0-1, where 1 is highest quality)",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "Difficulty level of the flashcard",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
      },
      description: "Optional tags for categorizing the flashcard",
    },
  },
  additionalProperties: false,
} as const;

/**
 * JSON Schema for multiple flashcard candidates (array response)
 */
export const FLASHCARD_CANDIDATES_ARRAY_SCHEMA = {
  type: "object",
  required: ["flashcards"],
  properties: {
    flashcards: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: FLASHCARD_CANDIDATE_SCHEMA,
      description: "Array of generated flashcard candidates",
    },
    metadata: {
      type: "object",
      properties: {
        total_count: {
          type: "number",
          description: "Total number of flashcards generated",
        },
        source_text_length: {
          type: "number",
          description: "Length of the source text in characters",
        },
        model_version: {
          type: "string",
          description: "Version of the model used for generation",
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

/**
 * OpenRouter ResponseFormat for flashcard generation
 * Use this for strict JSON Schema validation
 */
export const FLASHCARD_GENERATION_RESPONSE_FORMAT: ResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "flashcard_generation_v1",
    strict: true,
    schema: FLASHCARD_CANDIDATES_ARRAY_SCHEMA,
  },
};

/**
 * Non-strict version for fallback/retry scenarios
 * Allows the validator to attempt repairs
 */
export const FLASHCARD_GENERATION_RESPONSE_FORMAT_LENIENT: ResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "flashcard_generation_v1_lenient",
    strict: false,
    schema: FLASHCARD_CANDIDATES_ARRAY_SCHEMA,
  },
};

/**
 * Type definitions for the schema (for TypeScript type safety)
 */
export interface FlashcardCandidateSchema {
  front: string;
  back: string;
  score: number;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
}

export interface FlashcardGenerationResponse {
  flashcards: FlashcardCandidateSchema[];
  metadata?: {
    total_count?: number;
    source_text_length?: number;
    model_version?: string;
  };
}

/**
 * Validates if a parsed response matches the expected structure
 * This is a runtime type guard
 */
export function isFlashcardGenerationResponse(data: unknown): data is FlashcardGenerationResponse {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(obj.flashcards)) {
    return false;
  }

  // Check each flashcard
  return obj.flashcards.every((card) => {
    if (typeof card !== "object" || card === null) {
      return false;
    }

    const c = card as Record<string, unknown>;
    return (
      typeof c.front === "string" &&
      typeof c.back === "string" &&
      typeof c.score === "number" &&
      c.score >= 0 &&
      c.score <= 1
    );
  });
}
