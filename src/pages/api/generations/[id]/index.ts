import type { APIRoute } from "astro";
import type { GenerationDTO } from "@/types";

// ============================================
// DEMO MODE - Mock GET Generation Endpoint
// ============================================
// This endpoint is for polling in async mode
// In demo mode, we use sync responses, so this is rarely called

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
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

  // Mock generation data (in real implementation, fetch from database)
  const mockGeneration: GenerationDTO = {
    id: generationId,
    user_id: "mock-user-123",
    model: "mock-model-v1",
    source_text_length: 2500,
    generated_count: 5,
    accepted_unedited_count: 0,
    accepted_edited_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    candidates: [
      {
        candidate_id: "mock-1",
        front: "What is a mock question?",
        back: "A mock question is a sample question used for testing purposes.",
        score: 0.9,
      },
    ],
  };

  return new Response(JSON.stringify(mockGeneration), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
