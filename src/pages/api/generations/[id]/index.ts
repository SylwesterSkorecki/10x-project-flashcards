import type { APIRoute } from "astro";
import { createErrorResponse } from "@/lib/helpers/api-error";

export const prerender = false;

/**
 * GET /api/generations/{id}
 * Retrieves a generation by ID for the authenticated user
 * Note: Currently not used in sync flow, but important for async/polling mode
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

  // Step 3: Fetch generation from database (must belong to current user)
  const { data: generation, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .eq("user_id", userId)
    .single();

  if (error || !generation) {
    return createErrorResponse("not_found", "Generacja nie została znaleziona", 404);
  }

  // Step 4: Return generation data
  return new Response(JSON.stringify(generation), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
