import type { APIRoute } from "astro";
import { z } from "zod";
import { UpdateFlashcardSchema } from "../../../lib/schemas/flashcard.schema";
import { createErrorResponse, isUniqueConstraintError } from "../../../lib/helpers/api-error";
import { FlashcardsService } from "../../../lib/services/flashcards.service";

export const prerender = false;

/**
 * PUT /api/flashcards/{id}
 * Updates an existing flashcard (front, back, and/or source).
 * Only the owner can modify their flashcards.
 *
 * @requires Authentication - JWT token in Authorization header
 * @param id - UUID of the flashcard to update
 * @body {front?: string, back?: string, source?: string} - At least one field required
 * @returns 200 - Updated flashcard
 * @returns 400 - Validation error
 * @returns 401 - Unauthorized
 * @returns 404 - Flashcard not found
 * @returns 409 - Duplicate front content
 * @returns 500 - Internal server error
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  // Step 1: Extract and validate card ID
  const { id } = params;
  if (!id) {
    return createErrorResponse("validation_error", "ID fiszki jest wymagane", 400);
  }

  // Step 2: Verify authentication
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // Step 3: Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy format JSON", 400);
  }

  let validatedData;
  try {
    validatedData = UpdateFlashcardSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "validation_error",
        "Dane wejściowe są nieprawidłowe",
        400,
        error.flatten().fieldErrors
      );
    }
    throw error;
  }

  // Step 4: Update flashcard via service layer
  const flashcardsService = new FlashcardsService(supabase);

  try {
    const updatedFlashcard = await flashcardsService.updateFlashcard(user.id, id, validatedData);

    // If null, flashcard was not found or user is not the owner
    if (!updatedFlashcard) {
      return createErrorResponse("not_found", "Fiszka nie została znaleziona", 404);
    }

    // Step 5: Return success response
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle unique constraint violation (duplicate front)
    if (isUniqueConstraintError(error)) {
      return createErrorResponse("duplicate_front", "Fiszka z taką treścią front już istnieje", 409);
    }

    // Log unexpected errors for monitoring
    // eslint-disable-next-line no-console
    console.error("Error updating flashcard:", error);

    return createErrorResponse("internal_error", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
};
