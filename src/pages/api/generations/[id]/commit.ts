import type { APIRoute } from "astro";
import type { CommitGenerationCommand, BulkSaveResult } from "@/types";

// ============================================
// DEMO MODE - Mock Commit Endpoint
// ============================================
// This is a temporary mock implementation for testing the UI
// Replace with real implementation when backend is ready

export const prerender = false;

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

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock save logic with some random skips for demo purposes
    const saved: BulkSaveResult["saved"] = [];
    const skipped: BulkSaveResult["skipped"] = [];

    body.accepted.forEach((candidate, index) => {
      // Simulate duplicate detection (10% chance for demo)
      const shouldSkip = Math.random() < 0.1 && index > 0;
      
      if (shouldSkip) {
        skipped.push({
          front: candidate.front,
          reason: "A flashcard with this front side already exists in your collection",
        });
      } else {
        saved.push({
          id: `mock-card-${Date.now()}-${index}`,
          front: candidate.front,
        });
      }
    });

    const result: BulkSaveResult = {
      saved,
      skipped,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mock commit API error:", error);
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
