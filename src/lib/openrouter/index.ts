/**
 * OpenRouter module - Central export for all OpenRouter-related functionality
 */

export { ResponseValidator, responseValidator } from "./response-validator";
export {
  SYSTEM_MESSAGES,
  JSON_ONLY_SYSTEM_MESSAGE,
  FLASHCARD_GENERATION_SYSTEM_MESSAGE,
  STRICT_JSON_SCHEMA_SYSTEM_MESSAGE,
  RETRY_VALIDATION_SYSTEM_MESSAGE,
  combineSystemMessages,
  createFlashcardGenerationPrompt,
} from "./templates";
export {
  FLASHCARD_GENERATION_RESPONSE_FORMAT,
  FLASHCARD_GENERATION_RESPONSE_FORMAT_LENIENT,
  FLASHCARD_CANDIDATE_SCHEMA,
  FLASHCARD_CANDIDATES_ARRAY_SCHEMA,
  isFlashcardGenerationResponse,
  type FlashcardCandidateSchema,
  type FlashcardGenerationResponse,
} from "./flashcard-generation.schema";
