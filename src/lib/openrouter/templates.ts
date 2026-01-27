/**
 * System message templates for OpenRouter conversations
 * 
 * These templates define the behavior and constraints for the AI model
 * to ensure consistent, reliable responses that match expected formats.
 */

import type { ChatMessage } from "../services/openrouter.service";

/**
 * Default system message for JSON-only responses
 * Enforces strict JSON output without additional text
 */
export const JSON_ONLY_SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "You are an assistant that returns only valid JSON matching the provided schema. " +
    "Never include explanation, commentary, or any text outside the JSON object. " +
    "Your entire response must be a single, valid JSON object.",
};

/**
 * System message for flashcard generation
 * Provides specific instructions for creating high-quality flashcards
 */
export const FLASHCARD_GENERATION_SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "You are an expert educational content creator specializing in flashcards. " +
    "Your task is to create clear, concise, and pedagogically effective flashcards. " +
    "Follow these guidelines:\n" +
    "- Each flashcard must have 'front' (question) and 'back' (answer) fields\n" +
    "- 'front' should be specific and unambiguous (max 200 characters)\n" +
    "- 'back' should be accurate and complete but concise (max 500 characters)\n" +
    "- Include a 'score' field (0.0-1.0) indicating flashcard quality\n" +
    "- Avoid overly complex or compound questions\n" +
    "- Focus on key concepts and actionable knowledge\n" +
    "- Return ONLY valid JSON with this structure: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\", \"score\": 0.9}]}\n" +
    "- Never include markdown formatting, explanations, or text outside the JSON object",
};

/**
 * System message for strict JSON schema adherence
 * Used when `strict: true` is set in response_format
 */
export const STRICT_JSON_SCHEMA_SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "You must strictly follow the provided JSON schema. " +
    "All required fields must be present. " +
    "All fields must match their specified types exactly. " +
    "Do not add additional properties not defined in the schema. " +
    "Your response must be valid JSON and nothing else.",
};

/**
 * System message for retry after validation failure
 * Used when the initial response fails validation
 */
export const RETRY_VALIDATION_SYSTEM_MESSAGE: ChatMessage = {
  role: "system",
  content:
    "Your previous response did not match the required JSON schema. " +
    "Please try again, ensuring your response:\n" +
    "1. Is valid JSON\n" +
    "2. Contains all required fields\n" +
    "3. Uses correct data types for all fields\n" +
    "4. Does not include any additional properties\n" +
    "5. Contains no text outside the JSON object",
};

/**
 * Creates a combined system message from multiple templates
 * 
 * @param templates - Array of system message templates to combine
 * @returns Combined system message
 */
export function combineSystemMessages(...templates: ChatMessage[]): ChatMessage {
  const combinedContent = templates
    .filter((msg) => msg.role === "system")
    .map((msg) => msg.content)
    .join("\n\n");

  return {
    role: "system",
    content: combinedContent,
  };
}

/**
 * Creates a user message for flashcard generation
 * 
 * @param sourceText - Source text to generate flashcards from
 * @param options - Optional configuration
 * @returns User message for flashcard generation
 */
export function createFlashcardGenerationPrompt(
  sourceText: string,
  options?: {
    maxCards?: number;
    difficulty?: "easy" | "medium" | "hard";
    language?: string;
  }
): ChatMessage {
  const { maxCards, difficulty, language = "Polish" } = options || {};

  let content = `Generate flashcards from the following text:\n\n${sourceText}\n\n`;

  if (maxCards) {
    content += `Generate up to ${maxCards} flashcards.\n`;
  }

  if (difficulty) {
    content += `Target difficulty level: ${difficulty}.\n`;
  }

  content += `Use ${language} language for both questions and answers.\n`;
  content += `Return the result as a valid JSON object matching the provided schema.`;

  return {
    role: "user",
    content,
  };
}

/**
 * Default system messages by use case
 */
export const SYSTEM_MESSAGES = {
  JSON_ONLY: JSON_ONLY_SYSTEM_MESSAGE,
  FLASHCARD_GENERATION: FLASHCARD_GENERATION_SYSTEM_MESSAGE,
  STRICT_JSON_SCHEMA: STRICT_JSON_SCHEMA_SYSTEM_MESSAGE,
  RETRY_VALIDATION: RETRY_VALIDATION_SYSTEM_MESSAGE,
} as const;
