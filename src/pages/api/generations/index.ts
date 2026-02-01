import type { APIRoute } from "astro";
import type { CreateGenerationCommand, CreateGenerationResponseSync } from "@/types";
import { GenerationsService } from "@/lib/services/generations.service";
import { createErrorResponse } from "@/lib/helpers/api-error";

export const prerender = false;

/**
 * POST /api/generations
 * Generates flashcard candidates from source text using AI
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // Guard: Check authentication (context.locals.supabase should be available from middleware)
  const supabase = locals.supabase;
  if (!supabase) {
    return createErrorResponse("internal_error", "Database client not available", 500);
  }

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Require authentication - no test mode bypass
  if (authError || !user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  const userId = user.id;

  try {
    // Parse and validate request body
    const body = (await request.json()) as CreateGenerationCommand;

    // Guard: Validate required fields
    if (!body.source_text) {
      return createErrorResponse("validation_error", "source_text is required", 400);
    }

    const sourceTextLength = body.source_text.length;

    // Guard: Validate length constraints
    if (sourceTextLength < 1000 || sourceTextLength > 10000) {
      return createErrorResponse("validation_error", "source_text must be between 1000 and 10000 characters", 400);
    }

    // Guard: Validate max_candidates if provided
    if (body.max_candidates !== undefined) {
      if (body.max_candidates < 1 || body.max_candidates > 20) {
        return createErrorResponse("validation_error", "max_candidates must be between 1 and 20", 400);
      }
    }

    // Get OpenRouter configuration from environment
    const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      console.error("OPENROUTER_API_KEY not configured");
      return createErrorResponse("internal_error", "AI service not configured. Please contact support.", 500);
    }

    // Initialize GenerationsService
    const generationsService = new GenerationsService(supabase, {
      openRouterApiKey,
      openRouterBaseUrl: import.meta.env.OPENROUTER_BASE_URL,
      openRouterDefaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
    });

    // Optional: Pre-flight cost estimation (log for monitoring)
    const costEstimate = generationsService.estimateGenerationCost(body.source_text);
    console.log("Generation cost estimate:", {
      userId,
      estimatedTokens: costEstimate.estimatedTotalTokens,
    });

    // Generate flashcards
    const response = await generationsService.generateFlashcards(userId, body);

    // Return successful response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generation API error:", error);

    // Handle known errors with appropriate messages
    if (error instanceof Error) {
      // User-friendly errors from service
      if (error.message.includes("must be between") || error.message.includes("cannot be empty")) {
        return createErrorResponse("validation_error", error.message, 400);
      }

      // Service unavailable
      if (error.message.includes("temporarily unavailable")) {
        return createErrorResponse("internal_error", error.message, 503);
      }

      // Timeout
      if (error.message.includes("timed out")) {
        return createErrorResponse("internal_error", error.message, 504);
      }

      // Generic internal error with user-friendly message
      return createErrorResponse("internal_error", "Failed to generate flashcards. Please try again.", 500);
    }

    // Unknown error
    return createErrorResponse("internal_error", "An unexpected error occurred", 500);
  }
};

/**
 * GET /api/generations
 * Not implemented - generations use synchronous POST responses
 */
export const GET: APIRoute = async () => {
  return createErrorResponse("not_implemented", "GET endpoint not implemented. Use POST to generate flashcards.", 501);
};
