import type { APIRoute } from "astro";
import type { CommitGenerationCommand, BulkSaveResult } from "@/types";
import { supabaseClient } from "@/db/supabase.client";
import type { TablesInsert } from "@/db/database.types";

export const prerender = false;

// TEMPORARY: Hardcoded test user ID for development
// TODO: Replace with real authentication when implemented
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const generationId = params.id;
    
    if (!generationId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "generation_id is required",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await request.json() as CommitGenerationCommand;
    
    if (!body.accepted || !Array.isArray(body.accepted)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "accepted array is required",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (body.accepted.length === 0) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "At least one candidate must be accepted",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = supabaseClient;

    // Verify that generation exists and belongs to test user
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id, user_id")
      .eq("id", generationId)
      .eq("user_id", TEST_USER_ID)
      .single();

    if (generationError || !generation) {
      return new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "Generation not found",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prepare flashcards for bulk insert
    const flashcardsToInsert: TablesInsert<"flashcards">[] = body.accepted.map(
      (candidate) => ({
        user_id: TEST_USER_ID,
        generation_id: generationId,
        front: candidate.front,
        back: candidate.back,
        source: candidate.source,
      })
    );

    const saved: BulkSaveResult["saved"] = [];
    const skipped: BulkSaveResult["skipped"] = [];

    // Insert flashcards one by one to handle duplicates gracefully
    // Note: Bulk insert with .insert() doesn't provide granular error handling
    // for unique constraint violations, so we process individually
    for (const flashcard of flashcardsToInsert) {
      const { data, error } = await supabase
        .from("flashcards")
        .insert(flashcard)
        .select("id, front")
        .single();

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
    return new Response(
      JSON.stringify({
        error: {
          code: "internal_error",
          message: "Failed to commit candidates",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
