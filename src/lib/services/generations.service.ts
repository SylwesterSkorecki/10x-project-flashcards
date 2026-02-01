/**
 * Generations Service - AI-powered flashcard generation
 *
 * Handles the business logic for generating flashcard candidates from source text
 * using OpenRouter API integration.
 */

import { OpenRouterService } from "./openrouter.service";
import {
  FLASHCARD_GENERATION_SYSTEM_MESSAGE,
  createFlashcardGenerationPrompt,
  FLASHCARD_GENERATION_RESPONSE_FORMAT,
  isFlashcardGenerationResponse,
  type FlashcardGenerationResponse,
} from "../openrouter";
import type { CreateGenerationCommand, CreateGenerationResponseSync, GenerationCandidate } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";
import { hashSourceText } from "../helpers/hash";

/**
 * Configuration for the generations service
 */
interface GenerationsServiceConfig {
  openRouterApiKey: string;
  openRouterBaseUrl?: string;
  openRouterDefaultModel?: string;
}

/**
 * Service for managing AI-powered flashcard generation
 */
export class GenerationsService {
  private readonly openRouter: OpenRouterService;
  private readonly supabase: SupabaseClient;

  /**
   * Creates a new GenerationsService instance
   *
   * @param supabase - Supabase client for database operations
   * @param config - Service configuration
   */
  constructor(supabase: SupabaseClient, config: GenerationsServiceConfig) {
    this.supabase = supabase;

    // Initialize OpenRouter service
    this.openRouter = new OpenRouterService({
      apiKey: config.openRouterApiKey,
      baseUrl: config.openRouterBaseUrl,
      defaultModel: config.openRouterDefaultModel,
      timeoutMs: 30000,
      maxRetries: 2,
      maxValidationRetries: 2,
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
      },
    });
  }

  /**
   * Generates flashcard candidates from source text using AI
   *
   * @param userId - ID of the user making the request
   * @param command - Generation command with source text and options
   * @returns Synchronous response with generated candidates
   */
  async generateFlashcards(userId: string, command: CreateGenerationCommand): Promise<CreateGenerationResponseSync> {
    const { source_text, model, max_candidates = 8, timeout_seconds = 25 } = command;

    // Guard: Validate input
    if (!source_text || source_text.trim() === "") {
      throw new Error("Source text cannot be empty");
    }

    const sourceTextLength = source_text.length;

    // Guard: Validate length constraints
    if (sourceTextLength < 1000 || sourceTextLength > 10000) {
      throw new Error("Source text must be between 1000 and 10000 characters");
    }

    // Guard: Validate max_candidates
    if (max_candidates < 1 || max_candidates > 20) {
      throw new Error("max_candidates must be between 1 and 20");
    }

    // Compute hash of source text for deduplication
    const sourceTextHash = hashSourceText(source_text);

    // Start timing
    const startTime = Date.now();

    try {
      // Prepare messages for OpenRouter
      const systemMessage = FLASHCARD_GENERATION_SYSTEM_MESSAGE;
      const userMessage = createFlashcardGenerationPrompt(source_text, {
        maxCards: max_candidates,
        language: "Polish",
      });

      // Call OpenRouter API
      const conversationId = `gen-${userId}-${Date.now()}`;

      // TEMPORARY: Test without response_format to isolate the issue
      console.log("🔍 Sending request to OpenRouter...");

      const response = await this.openRouter.sendChatMessage(conversationId, [systemMessage, userMessage], {
        model: model || this.openRouter.defaultModel,
        temperature: 0.2, // Low temperature for consistent, factual responses
        max_tokens: 2000, // Sufficient for multiple flashcards
        // TEMPORARY: Commented out to test if this is causing the error
        // response_format: FLASHCARD_GENERATION_RESPONSE_FORMAT,
      });

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Parse and validate response
      const parsedResponse = this._parseGenerationResponse(response.content);

      // Convert to GenerationCandidate format
      const candidates = this._convertToGenerationCandidates(parsedResponse.flashcards, max_candidates);

      // Store generation record in database
      const generationId = await this._storeGenerationRecord(
        userId,
        sourceTextHash,
        sourceTextLength,
        response.model,
        candidates.length,
        durationMs
      );

      // Return synchronous response
      return {
        generation_id: generationId,
        model: response.model,
        generated_count: candidates.length,
        candidates,
        duration_ms: durationMs,
      };
    } catch (error) {
      // Log error to database
      await this._logGenerationError(
        userId,
        sourceTextHash,
        sourceTextLength,
        model || this.openRouter.defaultModel,
        error instanceof Error ? error.message : "Unknown error"
      );

      // Re-throw with user-friendly message
      if (error instanceof Error) {
        if (error.message.includes("validation failed")) {
          throw new Error("AI model returned invalid response format. Please try again.");
        }
        if (error.message.includes("timeout")) {
          throw new Error("Request timed out. Please try with shorter text or try again later.");
        }
        if (error.message.includes("Circuit breaker")) {
          throw new Error("AI service is temporarily unavailable. Please try again in a few minutes.");
        }
      }

      throw error;
    }
  }

  /**
   * Estimates the cost of generating flashcards (tokens and pricing)
   *
   * @param sourceText - Source text to analyze
   * @returns Estimated token count and cost
   */
  estimateGenerationCost(sourceText: string): {
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    estimatedTotalTokens: number;
  } {
    // Rough estimation: 1 token ≈ 4 characters for English, ≈ 2.5 for Polish
    const charsPerToken = 2.5; // Polish text
    const sourceTextTokens = Math.ceil(sourceText.length / charsPerToken);

    // System message + user message overhead
    const systemMessageTokens = 100; // Approximate
    const userMessageOverhead = 50; // Prompt template overhead

    const estimatedPromptTokens = sourceTextTokens + systemMessageTokens + userMessageOverhead;

    // Completion tokens: estimate based on number of flashcards
    // Each flashcard: ~50 tokens for question + ~100 tokens for answer = 150 tokens
    // Max 20 flashcards = 3000 tokens, but usually 5-10 cards = 750-1500 tokens
    const estimatedCompletionTokens = 1000; // Conservative estimate

    return {
      estimatedPromptTokens,
      estimatedCompletionTokens,
      estimatedTotalTokens: estimatedPromptTokens + estimatedCompletionTokens,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parses the AI response into FlashcardGenerationResponse
   *
   * @param content - Response content from AI
   * @returns Parsed flashcard generation response
   */
  private _parseGenerationResponse(content: string): FlashcardGenerationResponse {
    try {
      // Clean up markdown formatting if present
      let cleanContent = content.trim();

      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
      const match = cleanContent.match(codeBlockRegex);
      if (match) {
        cleanContent = match[1].trim();
      }

      // Log cleaned content for debugging
      console.log("Parsing AI response:", {
        originalLength: content.length,
        cleanedLength: cleanContent.length,
        startsWithCodeBlock: content.trim().startsWith("```"),
      });

      const parsed = JSON.parse(cleanContent);

      // Handle different field naming conventions from AI
      // AI might use "question"/"answer" instead of "front"/"back"
      if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        parsed.flashcards = parsed.flashcards.map((card: any) => {
          // Map question -> front, answer -> back if needed
          if (card.question && !card.front) {
            card.front = card.question;
            delete card.question;
          }
          if (card.answer && !card.back) {
            card.back = card.answer;
            delete card.answer;
          }
          // Add default score if missing
          if (typeof card.score !== "number") {
            card.score = 0.8; // Default score
          }
          return card;
        });
      }

      // Validate structure
      if (!isFlashcardGenerationResponse(parsed)) {
        console.error("Validation failed for parsed response:", parsed);
        throw new Error("Invalid flashcard generation response structure");
      }

      return parsed;
    } catch (error) {
      console.error("Failed to parse AI response:", {
        error: error instanceof Error ? error.message : "Unknown error",
        contentPreview: content.substring(0, 200),
      });

      throw new Error(
        `Failed to parse generation response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Converts AI response flashcards to GenerationCandidate format
   *
   * @param flashcards - Flashcards from AI response
   * @param maxCandidates - Maximum number of candidates to return
   * @returns Array of generation candidates
   */
  private _convertToGenerationCandidates(
    flashcards: {
      front: string;
      back: string;
      score: number;
      difficulty?: string;
      tags?: string[];
    }[],
    maxCandidates: number
  ): GenerationCandidate[] {
    // Sort by score (descending) and take top N
    const sortedFlashcards = flashcards
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates);

    // Convert to GenerationCandidate format
    return sortedFlashcards.map((card, index) => ({
      candidate_id: `candidate-${Date.now()}-${index}`,
      front: card.front,
      back: card.back,
      score: card.score,
      status: "pending",
    }));
  }

  /**
   * Stores generation record in database
   *
   * @param userId - User ID
   * @param sourceTextHash - Hash of source text
   * @param sourceTextLength - Length of source text
   * @param model - Model used for generation
   * @param generatedCount - Number of candidates generated
   * @param durationMs - Generation duration in milliseconds
   * @returns Generation ID
   */
  private async _storeGenerationRecord(
    userId: string,
    sourceTextHash: string,
    sourceTextLength: number,
    model: string,
    generatedCount: number,
    durationMs: number
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("generations")
      .insert({
        user_id: userId,
        model,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        generated_count: generatedCount,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        generation_duration: durationMs,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to store generation record:", error);
      throw new Error("Failed to store generation record");
    }

    return data.id;
  }

  /**
   * Logs generation error to database
   *
   * @param userId - User ID
   * @param sourceTextHash - Hash of source text
   * @param sourceTextLength - Length of source text
   * @param model - Model used for generation
   * @param errorMessage - Error message
   */
  private async _logGenerationError(
    userId: string,
    sourceTextHash: string,
    sourceTextLength: number,
    model: string,
    errorMessage: string
  ): Promise<void> {
    try {
      // Determine error code based on message
      let errorCode = "unknown_error";
      if (errorMessage.includes("validation")) {
        errorCode = "validation_error";
      } else if (errorMessage.includes("timeout")) {
        errorCode = "timeout_error";
      } else if (errorMessage.includes("Circuit breaker")) {
        errorCode = "service_unavailable";
      } else if (errorMessage.includes("Authorization")) {
        errorCode = "auth_error";
      }

      await this.supabase.from("generation_error_logs").insert({
        user_id: userId,
        model,
        error_code: errorCode,
        error_message: errorMessage.substring(0, 500), // Limit message length
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
      });
    } catch (error) {
      // Silent fail - don't throw if error logging fails
      console.error("Failed to log generation error:", error);
    }
  }
}
