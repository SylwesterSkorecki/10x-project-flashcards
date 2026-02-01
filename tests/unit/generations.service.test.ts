import { describe, it, expect, beforeEach, vi } from "vitest";
import { GenerationsService } from "@/lib/services/generations.service";
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateGenerationCommand } from "@/types";

// Mock the OpenRouter service
vi.mock("@/lib/services/openrouter.service", () => {
  const MockOpenRouterService = vi.fn().mockImplementation(function (this: any) {
    this.sendChatMessage = vi.fn();
    this.defaultModel = "anthropic/claude-3.5-sonnet";
    return this;
  });

  return {
    OpenRouterService: MockOpenRouterService,
  };
});

// Mock the hash helper
vi.mock("@/lib/helpers/hash", () => ({
  hashSourceText: vi.fn((text: string) => `hash-${text.length}`),
}));

describe("GenerationsService", () => {
  let service: GenerationsService;
  let mockSupabase: SupabaseClient;
  let mockOpenRouter: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
    } as any;

    // Create service instance
    service = new GenerationsService(mockSupabase, {
      openRouterApiKey: "test-api-key",
      openRouterBaseUrl: "https://test.openrouter.ai",
      openRouterDefaultModel: "anthropic/claude-3.5-sonnet",
    });

    // Get reference to mocked OpenRouter instance
    mockOpenRouter = (service as any).openRouter;
  });

  // ============================================================================
  // PRIVATE METHOD: _parseGenerationResponse
  // ============================================================================

  describe("_parseGenerationResponse", () => {
    it("should parse valid JSON response without code blocks", () => {
      const validResponse = JSON.stringify({
        flashcards: [
          { front: "Pytanie 1", back: "Odpowiedź 1", score: 0.9 },
          { front: "Pytanie 2", back: "Odpowiedź 2", score: 0.8 },
        ],
      });

      const result = (service as any)._parseGenerationResponse(validResponse);

      expect(result).toEqual({
        flashcards: [
          { front: "Pytanie 1", back: "Odpowiedź 1", score: 0.9 },
          { front: "Pytanie 2", back: "Odpowiedź 2", score: 0.8 },
        ],
      });
    });

    it("should parse JSON response wrapped in markdown code blocks", () => {
      const responseWithCodeBlock = `\`\`\`json
{
  "flashcards": [
    { "front": "Pytanie", "back": "Odpowiedź", "score": 0.95 }
  ]
}
\`\`\``;

      const result = (service as any)._parseGenerationResponse(responseWithCodeBlock);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].front).toBe("Pytanie");
    });

    it("should parse JSON response wrapped in markdown code blocks without language tag", () => {
      const responseWithCodeBlock = `\`\`\`
{
  "flashcards": [
    { "front": "Test", "back": "Answer", "score": 0.7 }
  ]
}
\`\`\``;

      const result = (service as any)._parseGenerationResponse(responseWithCodeBlock);

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0].score).toBe(0.7);
    });

    it("should map question/answer fields to front/back", () => {
      const responseWithQuestionAnswer = JSON.stringify({
        flashcards: [
          { question: "Pytanie 1", answer: "Odpowiedź 1", score: 0.9 },
          { question: "Pytanie 2", answer: "Odpowiedź 2", score: 0.8 },
        ],
      });

      const result = (service as any)._parseGenerationResponse(responseWithQuestionAnswer);

      expect(result.flashcards[0].front).toBe("Pytanie 1");
      expect(result.flashcards[0].back).toBe("Odpowiedź 1");
      expect(result.flashcards[0]).not.toHaveProperty("question");
      expect(result.flashcards[0]).not.toHaveProperty("answer");
    });

    it("should add default score if missing", () => {
      const responseWithoutScore = JSON.stringify({
        flashcards: [{ front: "Pytanie", back: "Odpowiedź" }],
      });

      const result = (service as any)._parseGenerationResponse(responseWithoutScore);

      expect(result.flashcards[0].score).toBe(0.8);
    });

    it("should preserve existing score if present", () => {
      const responseWithScore = JSON.stringify({
        flashcards: [{ front: "Pytanie", back: "Odpowiedź", score: 0.95 }],
      });

      const result = (service as any)._parseGenerationResponse(responseWithScore);

      expect(result.flashcards[0].score).toBe(0.95);
    });

    it("should handle flashcards with optional fields (difficulty, tags)", () => {
      const responseWithOptionalFields = JSON.stringify({
        flashcards: [
          {
            front: "Pytanie",
            back: "Odpowiedź",
            score: 0.9,
            difficulty: "medium",
            tags: ["typescript", "testing"],
          },
        ],
      });

      const result = (service as any)._parseGenerationResponse(responseWithOptionalFields);

      expect(result.flashcards[0].difficulty).toBe("medium");
      expect(result.flashcards[0].tags).toEqual(["typescript", "testing"]);
    });

    it("should throw error for invalid JSON", () => {
      const invalidJson = "not a valid json {";

      expect(() => {
        (service as any)._parseGenerationResponse(invalidJson);
      }).toThrow("Failed to parse generation response");
    });

    it("should throw error when flashcards array is missing", () => {
      const responseWithoutFlashcards = JSON.stringify({
        metadata: { total_count: 0 },
      });

      expect(() => {
        (service as any)._parseGenerationResponse(responseWithoutFlashcards);
      }).toThrow("Invalid flashcard generation response structure");
    });

    it("should throw error when flashcards is not an array", () => {
      const responseWithInvalidFlashcards = JSON.stringify({
        flashcards: "not an array",
      });

      expect(() => {
        (service as any)._parseGenerationResponse(responseWithInvalidFlashcards);
      }).toThrow("Invalid flashcard generation response structure");
    });

    it("should throw error for flashcards with missing required fields", () => {
      const responseWithIncompleteCard = JSON.stringify({
        flashcards: [
          { front: "Pytanie", score: 0.9 }, // Missing 'back'
        ],
      });

      expect(() => {
        (service as any)._parseGenerationResponse(responseWithIncompleteCard);
      }).toThrow("Invalid flashcard generation response structure");
    });

    it("should throw error for flashcards with invalid score", () => {
      const responseWithInvalidScore = JSON.stringify({
        flashcards: [
          { front: "Pytanie", back: "Odpowiedź", score: 1.5 }, // Score > 1
        ],
      });

      expect(() => {
        (service as any)._parseGenerationResponse(responseWithInvalidScore);
      }).toThrow("Invalid flashcard generation response structure");
    });

    it("should throw error for flashcards with negative score", () => {
      const responseWithNegativeScore = JSON.stringify({
        flashcards: [
          { front: "Pytanie", back: "Odpowiedź", score: -0.1 }, // Score < 0
        ],
      });

      expect(() => {
        (service as any)._parseGenerationResponse(responseWithNegativeScore);
      }).toThrow("Invalid flashcard generation response structure");
    });

    it("should handle whitespace in JSON response", () => {
      const responseWithWhitespace = `
        
        {
          "flashcards": [
            { "front": "Test", "back": "Answer", "score": 0.8 }
          ]
        }
        
      `;

      const result = (service as any)._parseGenerationResponse(responseWithWhitespace);

      expect(result.flashcards).toHaveLength(1);
    });

    it("should handle empty flashcards array", () => {
      const responseWithEmptyArray = JSON.stringify({
        flashcards: [],
      });

      // Empty array passes validation (array.every() returns true for empty arrays)
      // Business logic should handle this case separately
      const result = (service as any)._parseGenerationResponse(responseWithEmptyArray);
      expect(result.flashcards).toHaveLength(0);
    });
  });

  // ============================================================================
  // PRIVATE METHOD: _convertToGenerationCandidates
  // ============================================================================

  describe("_convertToGenerationCandidates", () => {
    it("should convert flashcards to generation candidates", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.9 },
        { front: "Q2", back: "A2", score: 0.8 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        front: "Q1",
        back: "A1",
        score: 0.9,
        status: "pending",
      });
      expect(result[0]).toHaveProperty("candidate_id");
      expect(result[0].candidate_id).toMatch(/^candidate-\d+-0$/);
    });

    it("should sort flashcards by score in descending order", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.5 },
        { front: "Q2", back: "A2", score: 0.9 },
        { front: "Q3", back: "A3", score: 0.7 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.7);
      expect(result[2].score).toBe(0.5);
    });

    it("should limit candidates to maxCandidates", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.9 },
        { front: "Q2", back: "A2", score: 0.8 },
        { front: "Q3", back: "A3", score: 0.7 },
        { front: "Q4", back: "A4", score: 0.6 },
        { front: "Q5", back: "A5", score: 0.5 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 3);

      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(0.9);
      expect(result[1].score).toBe(0.8);
      expect(result[2].score).toBe(0.7);
    });

    it("should return all cards when less than maxCandidates", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.9 },
        { front: "Q2", back: "A2", score: 0.8 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result).toHaveLength(2);
    });

    it("should generate unique candidate IDs", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.9 },
        { front: "Q2", back: "A2", score: 0.8 },
        { front: "Q3", back: "A3", score: 0.7 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      const ids = result.map((c: any) => c.candidate_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should set status to pending for all candidates", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.9 },
        { front: "Q2", back: "A2", score: 0.8 },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result.every((c: any) => c.status === "pending")).toBe(true);
    });

    it("should preserve front and back content", () => {
      const flashcards = [
        {
          front: "Co to jest TypeScript?",
          back: "TypeScript to typowany nadzbiór JavaScript",
          score: 0.95,
        },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result[0].front).toBe("Co to jest TypeScript?");
      expect(result[0].back).toBe("TypeScript to typowany nadzbiór JavaScript");
    });

    it("should handle empty flashcards array", () => {
      const flashcards: any[] = [];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(result).toHaveLength(0);
    });

    it("should not mutate original flashcards array", () => {
      const flashcards = [
        { front: "Q1", back: "A1", score: 0.5 },
        { front: "Q2", back: "A2", score: 0.9 },
      ];
      const originalOrder = [...flashcards];

      (service as any)._convertToGenerationCandidates(flashcards, 10);

      expect(flashcards).toEqual(originalOrder);
    });

    it("should handle flashcards with optional fields", () => {
      const flashcards = [
        {
          front: "Q1",
          back: "A1",
          score: 0.9,
          difficulty: "hard",
          tags: ["advanced"],
        },
      ];

      const result = (service as any)._convertToGenerationCandidates(flashcards, 10);

      // Optional fields should not be in the result (not part of GenerationCandidate)
      expect(result[0]).not.toHaveProperty("difficulty");
      expect(result[0]).not.toHaveProperty("tags");
    });
  });

  // ============================================================================
  // PUBLIC METHOD: estimateGenerationCost
  // ============================================================================

  describe("estimateGenerationCost", () => {
    it("should estimate cost for typical Polish text", () => {
      const sourceText = "To jest przykładowy tekst w języku polskim. ".repeat(20); // ~900 chars

      const result = service.estimateGenerationCost(sourceText);

      expect(result.estimatedPromptTokens).toBeGreaterThan(0);
      expect(result.estimatedCompletionTokens).toBe(1000);
      expect(result.estimatedTotalTokens).toBe(result.estimatedPromptTokens + result.estimatedCompletionTokens);
    });

    it("should calculate tokens based on 2.5 chars per token for Polish", () => {
      const sourceText = "A".repeat(250); // 250 chars = 100 tokens

      const result = service.estimateGenerationCost(sourceText);

      // 100 (source) + 100 (system) + 50 (user overhead) = 250
      expect(result.estimatedPromptTokens).toBe(250);
    });

    it("should include system message and user message overhead", () => {
      const sourceText = "A".repeat(100); // 100 chars = 40 tokens

      const result = service.estimateGenerationCost(sourceText);

      // 40 (source) + 100 (system) + 50 (user overhead) = 190
      expect(result.estimatedPromptTokens).toBe(190);
    });

    it("should estimate fixed completion tokens", () => {
      const sourceText = "Short text";

      const result = service.estimateGenerationCost(sourceText);

      expect(result.estimatedCompletionTokens).toBe(1000);
    });

    it("should handle empty string", () => {
      const sourceText = "";

      const result = service.estimateGenerationCost(sourceText);

      // 0 (source) + 100 (system) + 50 (user overhead) = 150
      expect(result.estimatedPromptTokens).toBe(150);
      expect(result.estimatedCompletionTokens).toBe(1000);
      expect(result.estimatedTotalTokens).toBe(1150);
    });

    it("should handle very long text", () => {
      const sourceText = "A".repeat(10000); // 10000 chars = 4000 tokens

      const result = service.estimateGenerationCost(sourceText);

      // 4000 (source) + 100 (system) + 50 (user overhead) = 4150
      expect(result.estimatedPromptTokens).toBe(4150);
    });

    it("should round up token count", () => {
      const sourceText = "A".repeat(101); // 101 chars / 2.5 = 40.4 tokens -> ceil to 41

      const result = service.estimateGenerationCost(sourceText);

      // 41 (source) + 100 (system) + 50 (user overhead) = 191
      expect(result.estimatedPromptTokens).toBe(191);
    });

    it("should return consistent structure", () => {
      const sourceText = "Test text";

      const result = service.estimateGenerationCost(sourceText);

      expect(result).toHaveProperty("estimatedPromptTokens");
      expect(result).toHaveProperty("estimatedCompletionTokens");
      expect(result).toHaveProperty("estimatedTotalTokens");
      expect(typeof result.estimatedPromptTokens).toBe("number");
      expect(typeof result.estimatedCompletionTokens).toBe("number");
      expect(typeof result.estimatedTotalTokens).toBe("number");
    });
  });

  // ============================================================================
  // PUBLIC METHOD: generateFlashcards - Input Validation
  // ============================================================================

  describe("generateFlashcards - input validation", () => {
    const userId = "test-user-id";
    const validSourceText = "A".repeat(1500); // Valid length

    it("should throw error for empty source text", async () => {
      const command: CreateGenerationCommand = {
        source_text: "",
        max_candidates: 8,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow("Source text cannot be empty");
    });

    it("should throw error for whitespace-only source text", async () => {
      const command: CreateGenerationCommand = {
        source_text: "   \n\t  ",
        max_candidates: 8,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow("Source text cannot be empty");
    });

    it("should throw error for source text shorter than 1000 characters", async () => {
      const command: CreateGenerationCommand = {
        source_text: "A".repeat(999),
        max_candidates: 8,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow(
        "Source text must be between 1000 and 10000 characters"
      );
    });

    it("should throw error for source text longer than 10000 characters", async () => {
      const command: CreateGenerationCommand = {
        source_text: "A".repeat(10001),
        max_candidates: 8,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow(
        "Source text must be between 1000 and 10000 characters"
      );
    });

    it("should accept source text with exactly 1000 characters", async () => {
      const command: CreateGenerationCommand = {
        source_text: "A".repeat(1000),
        max_candidates: 8,
      };

      // Mock successful response
      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: [{ front: "Q", back: "A", score: 0.9 }],
        }),
        model: "test-model",
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });

      await expect(service.generateFlashcards(userId, command)).resolves.toBeDefined();
    });

    it("should accept source text with exactly 10000 characters", async () => {
      const command: CreateGenerationCommand = {
        source_text: "A".repeat(10000),
        max_candidates: 8,
      };

      // Mock successful response
      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: [{ front: "Q", back: "A", score: 0.9 }],
        }),
        model: "test-model",
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });

      await expect(service.generateFlashcards(userId, command)).resolves.toBeDefined();
    });

    it("should throw error for max_candidates less than 1", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
        max_candidates: 0,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow(
        "max_candidates must be between 1 and 20"
      );
    });

    it("should throw error for max_candidates greater than 20", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
        max_candidates: 21,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow(
        "max_candidates must be between 1 and 20"
      );
    });

    it("should throw error for negative max_candidates", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
        max_candidates: -5,
      };

      await expect(service.generateFlashcards(userId, command)).rejects.toThrow(
        "max_candidates must be between 1 and 20"
      );
    });

    it("should accept max_candidates of exactly 1", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
        max_candidates: 1,
      };

      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: [{ front: "Q", back: "A", score: 0.9 }],
        }),
        model: "test-model",
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });

      await expect(service.generateFlashcards(userId, command)).resolves.toBeDefined();
    });

    it("should accept max_candidates of exactly 20", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
        max_candidates: 20,
      };

      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: [{ front: "Q", back: "A", score: 0.9 }],
        }),
        model: "test-model",
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });

      await expect(service.generateFlashcards(userId, command)).resolves.toBeDefined();
    });

    it("should use default max_candidates of 8 when not provided", async () => {
      const command: CreateGenerationCommand = {
        source_text: validSourceText,
      };

      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: Array.from({ length: 10 }, (_, i) => ({
            front: `Q${i}`,
            back: `A${i}`,
            score: 0.9 - i * 0.05,
          })),
        }),
        model: "test-model",
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });

      const result = await service.generateFlashcards(userId, command);

      // Should be limited to 8 (default max_candidates)
      expect(result.candidates.length).toBe(8);
    });
  });

  // ============================================================================
  // PUBLIC METHOD: generateFlashcards - Error Handling
  // ============================================================================

  describe("generateFlashcards - error handling", () => {
    const userId = "test-user-id";
    const validCommand: CreateGenerationCommand = {
      source_text: "A".repeat(1500),
      max_candidates: 8,
    };

    it("should transform validation error to user-friendly message", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Response validation failed: invalid format"));

      await expect(service.generateFlashcards(userId, validCommand)).rejects.toThrow(
        "AI model returned invalid response format. Please try again."
      );
    });

    it("should transform timeout error to user-friendly message", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Request timeout exceeded"));

      await expect(service.generateFlashcards(userId, validCommand)).rejects.toThrow(
        "Request timed out. Please try with shorter text or try again later."
      );
    });

    it("should transform circuit breaker error to user-friendly message", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Circuit breaker is open"));

      await expect(service.generateFlashcards(userId, validCommand)).rejects.toThrow(
        "AI service is temporarily unavailable. Please try again in a few minutes."
      );
    });

    it("should log error to database when generation fails", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Test error"));

      const insertSpy = vi.spyOn(mockSupabase, "insert");

      try {
        await service.generateFlashcards(userId, validCommand);
      } catch (error) {
        // Expected to throw
      }

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          error_code: "unknown_error",
          error_message: "Test error",
        })
      );
    });

    it("should log validation error with correct error code", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("validation failed"));

      const insertSpy = vi.spyOn(mockSupabase, "insert");

      try {
        await service.generateFlashcards(userId, validCommand);
      } catch (error) {
        // Expected to throw
      }

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: "validation_error",
        })
      );
    });

    it("should log timeout error with correct error code", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("timeout occurred"));

      const insertSpy = vi.spyOn(mockSupabase, "insert");

      try {
        await service.generateFlashcards(userId, validCommand);
      } catch (error) {
        // Expected to throw
      }

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: "timeout_error",
        })
      );
    });

    it("should log circuit breaker error with correct error code", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Circuit breaker open"));

      const insertSpy = vi.spyOn(mockSupabase, "insert");

      try {
        await service.generateFlashcards(userId, validCommand);
      } catch (error) {
        // Expected to throw
      }

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error_code: "service_unavailable",
        })
      );
    });

    it("should not fail if error logging fails", async () => {
      mockOpenRouter.sendChatMessage.mockRejectedValue(new Error("Test error"));
      mockSupabase.insert.mockReturnThis();
      // Simulate error logging failure by not setting up the chain properly

      await expect(service.generateFlashcards(userId, validCommand)).rejects.toThrow("Test error");
      // Should not throw additional error from logging
    });

    it("should re-throw original error after logging", async () => {
      const originalError = new Error("Original error message");
      mockOpenRouter.sendChatMessage.mockRejectedValue(originalError);

      await expect(service.generateFlashcards(userId, validCommand)).rejects.toThrow("Original error message");
    });
  });

  // ============================================================================
  // PUBLIC METHOD: generateFlashcards - Success Flow
  // ============================================================================

  describe("generateFlashcards - success flow", () => {
    const userId = "test-user-id";
    const validCommand: CreateGenerationCommand = {
      source_text: "A".repeat(1500),
      max_candidates: 5,
    };

    beforeEach(() => {
      // Mock successful OpenRouter response
      mockOpenRouter.sendChatMessage.mockResolvedValue({
        content: JSON.stringify({
          flashcards: [
            { front: "Q1", back: "A1", score: 0.95 },
            { front: "Q2", back: "A2", score: 0.9 },
            { front: "Q3", back: "A3", score: 0.85 },
          ],
        }),
        model: "anthropic/claude-3.5-sonnet",
      });

      // Mock successful database insert
      mockSupabase.single.mockResolvedValue({
        data: { id: "gen-123" },
        error: null,
      });
    });

    it("should return generation response with all required fields", async () => {
      const result = await service.generateFlashcards(userId, validCommand);

      expect(result).toMatchObject({
        generation_id: "gen-123",
        model: "anthropic/claude-3.5-sonnet",
        generated_count: 3,
      });
      expect(result).toHaveProperty("candidates");
      expect(result).toHaveProperty("duration_ms");
      expect(typeof result.duration_ms).toBe("number");
    });

    it("should return candidates with correct structure", async () => {
      const result = await service.generateFlashcards(userId, validCommand);

      expect(result.candidates).toHaveLength(3);
      result.candidates.forEach((candidate) => {
        expect(candidate).toMatchObject({
          front: expect.any(String),
          back: expect.any(String),
          score: expect.any(Number),
          status: "pending",
        });
        expect(candidate).toHaveProperty("candidate_id");
      });
    });

    it("should store generation record in database", async () => {
      const insertSpy = vi.spyOn(mockSupabase, "insert");

      await service.generateFlashcards(userId, validCommand);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          model: "anthropic/claude-3.5-sonnet",
          generated_count: 3,
        })
      );
    });

    it("should use custom model when provided", async () => {
      const customCommand = {
        ...validCommand,
        model: "custom/model",
      };

      await service.generateFlashcards(userId, customCommand);

      expect(mockOpenRouter.sendChatMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          model: "custom/model",
        })
      );
    });

    it("should calculate duration in milliseconds", async () => {
      const result = await service.generateFlashcards(userId, validCommand);

      // Duration should be a non-negative integer
      // In unit tests with mocks, it can be 0 due to fast execution
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(result.duration_ms)).toBe(true);
    });
  });
});
