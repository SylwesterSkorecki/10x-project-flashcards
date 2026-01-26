import type { APIRoute } from "astro";
import type { CreateGenerationCommand, CreateGenerationResponseSync } from "@/types";

// ============================================
// DEMO MODE - Mock API Endpoint
// ============================================
// This is a temporary mock implementation for testing the UI
// Replace with real implementation when backend is ready

export const prerender = false;

// Mock candidates generator
function generateMockCandidates(sourceTextLength: number) {
  const count = Math.min(Math.floor(sourceTextLength / 500), 8); // 1 candidate per 500 chars, max 8
  
  const mockCandidates = [
    {
      candidate_id: "mock-1",
      front: "What is the capital of France?",
      back: "Paris is the capital and most populous city of France. It has been one of Europe's major centers of finance, diplomacy, commerce, and culture.",
      score: 0.95,
    },
    {
      candidate_id: "mock-2",
      front: "Who wrote 'Romeo and Juliet'?",
      back: "William Shakespeare wrote Romeo and Juliet around 1594-1596. It is one of his most famous plays and a classic tragedy.",
      score: 0.88,
    },
    {
      candidate_id: "mock-3",
      front: "What is photosynthesis?",
      back: "Photosynthesis is the process by which plants use sunlight, water and carbon dioxide to create oxygen and energy in the form of sugar.",
      score: 0.82,
    },
    {
      candidate_id: "mock-4",
      front: "When did World War II end?",
      back: "World War II ended in 1945. Germany surrendered in May 1945, and Japan surrendered in August 1945 after the atomic bombings.",
      score: 0.91,
    },
    {
      candidate_id: "mock-5",
      front: "What is the speed of light?",
      back: "The speed of light in vacuum is approximately 299,792,458 meters per second (about 186,282 miles per second). It is denoted by the constant 'c'.",
      score: 0.78,
    },
    {
      candidate_id: "mock-6",
      front: "Who painted the Mona Lisa?",
      back: "Leonardo da Vinci painted the Mona Lisa between 1503 and 1519. It is one of the most famous paintings in the world, housed in the Louvre Museum in Paris.",
      score: 0.93,
    },
    {
      candidate_id: "mock-7",
      front: "What is the largest planet in our solar system?",
      back: "Jupiter is the largest planet in our solar system. It has a mass of about 318 times that of Earth and is composed mainly of hydrogen and helium.",
      score: 0.85,
    },
    {
      candidate_id: "mock-8",
      front: "What is DNA?",
      back: "DNA (Deoxyribonucleic Acid) is a molecule that carries genetic instructions for the development, functioning, growth and reproduction of all known organisms.",
      score: 0.89,
    },
  ];

  return mockCandidates.slice(0, count);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json() as CreateGenerationCommand;
    
    // Basic validation
    if (!body.source_text) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "source_text is required",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const sourceTextLength = body.source_text.length;

    // Validate length
    if (sourceTextLength < 1000 || sourceTextLength > 10000) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "source_text must be between 1000 and 10000 characters",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Simulate processing delay (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate mock candidates
    const candidates = generateMockCandidates(sourceTextLength);
    const generationId = `mock-gen-${Date.now()}`;

    // Return synchronous response (200) with candidates
    const response: CreateGenerationResponseSync = {
      generation_id: generationId,
      model: "mock-model-v1",
      generated_count: candidates.length,
      candidates: candidates,
      duration_ms: 500,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mock API error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "internal_error",
          message: "Failed to process request",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Optional: GET endpoint for polling (not used in sync mode, but good to have)
export const GET: APIRoute = async ({ params, url }) => {
  const id = url.searchParams.get("id");
  
  return new Response(
    JSON.stringify({
      error: {
        code: "not_implemented",
        message: "GET endpoint not needed in demo mode (sync responses only)",
      },
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
};
