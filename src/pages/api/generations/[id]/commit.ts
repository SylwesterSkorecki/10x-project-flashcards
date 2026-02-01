import type { APIRoute } from "astro";
import type { CommitGenerationCommand, BulkSaveResult } from "@/types";
import type { TablesInsert } from "@/db/database.types";
import { createErrorResponse } from "@/lib/helpers/api-error";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Verify authentication
    const supabase = locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
    }

    const userId = user.id;

    // Step 2: Validate generation ID
    const generationId = params.id;

    if (!generationId) {
      return createErrorResponse("validation_error", "ID generacji jest wymagane", 400);
    }

    // Step 3: Parse and validate request body
    const body = (await request.json()) as CommitGenerationCommand;

    // Step 4: Validate request body
    if (!body.accepted || !Array.isArray(body.accepted)) {
      return createErrorResponse("validation_error", "Tablica zaakceptowanych kandydatów jest wymagana", 400);
    }

    if (body.accepted.length === 0) {
      return createErrorResponse("validation_error", "Musisz zaakceptować przynajmniej jednego kandydata", 400);
    }

    // Step 5: Verify that generation exists and belongs to current user
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id, user_id")
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (generationError || !generation) {
      return createErrorResponse("not_found", "Generacja nie została znaleziona", 404);
    }

    // Step 6: Prepare flashcards for bulk insert with current user
    const flashcardsToInsert: TablesInsert<"flashcards">[] = body.accepted.map((candidate) => ({
      user_id: userId,
      generation_id: generationId,
      front: candidate.front,
      back: candidate.back,
      source: candidate.source,
    }));

    const saved: BulkSaveResult["saved"] = [];
    const skipped: BulkSaveResult["skipped"] = [];

    // Insert flashcards one by one to handle duplicates gracefully
    // Note: Bulk insert with .insert() doesn't provide granular error handling
    // for unique constraint violations, so we process individually
    for (const flashcard of flashcardsToInsert) {
      const { data, error } = await supabase.from("flashcards").insert(flashcard).select("id, front").single();

      if (error) {
        // Check if error is due to duplicate front (unique constraint)
        // PostgreSQL error code 23505 = unique_violation
        if (error.code === "23505" && error.message.includes("flashcards_user_id_front_key")) {
          skipped.push({
            front: flashcard.front,
            reason: "A flashcard with this front side already exists in your collection",
          });
        } else {
          // For other errors, log and skip with generic message
          console.error("Failed to insert flashcard:", error);
          skipped.push({
            front: flashcard.front,
            reason: "Failed to save flashcard due to an error",
          });
        }
      } else if (data) {
        saved.push({
          id: data.id,
          front: data.front,
        });
      }
    }

    // Update generation statistics
    if (saved.length > 0) {
      const aiFullCount = body.accepted.filter((c) => c.source === "ai-full").length;
      const aiEditedCount = body.accepted.filter((c) => c.source === "ai-edited").length;

      await supabase
        .from("generations")
        .update({
          accepted_unedited_count: aiFullCount,
          accepted_edited_count: aiEditedCount,
        })
        .eq("id", generationId);
    }

    const result: BulkSaveResult = {
      saved,
      skipped,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Commit API error:", error);
    return createErrorResponse("internal_error", "Wystąpił błąd podczas zapisywania fiszek. Spróbuj ponownie.", 500);
  }
};
