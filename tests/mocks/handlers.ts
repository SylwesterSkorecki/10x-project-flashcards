import { http, HttpResponse } from "msw";

/**
 * MSW Request Handlers
 * Define mock API responses for testing
 */

const BASE_URL = process.env.PUBLIC_SUPABASE_URL || "http://localhost:54321";

export const handlers = [
  // Supabase Auth - Login
  http.post(`${BASE_URL}/auth/v1/token`, async () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
        role: "authenticated",
      },
    });
  }),

  // Supabase Auth - Get User
  http.get(`${BASE_URL}/auth/v1/user`, async () => {
    return HttpResponse.json({
      id: "mock-user-id",
      email: "test@example.com",
      role: "authenticated",
    });
  }),

  // OpenRouter - Generate Flashcards
  http.post("https://openrouter.ai/api/v1/chat/completions", async () => {
    return HttpResponse.json({
      id: "gen-mock-id",
      model: "anthropic/claude-3.5-sonnet",
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              flashcards: [
                {
                  question: "What is TypeScript?",
                  answer: "TypeScript is a typed superset of JavaScript.",
                  category: "Programming",
                },
              ],
            }),
          },
          finish_reason: "stop",
        },
      ],
    });
  }),

  // Flashcards API - Get all flashcards
  http.get("/api/flashcards", async () => {
    return HttpResponse.json([
      {
        id: "1",
        question: "What is React?",
        answer: "A JavaScript library for building user interfaces.",
        category: "Frontend",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Flashcards API - Create flashcard
  http.post("/api/flashcards", async () => {
    return HttpResponse.json(
      {
        id: "new-flashcard-id",
        question: "New Question",
        answer: "New Answer",
        category: "General",
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Generations API - Create generation
  http.post("/api/generations", async () => {
    return HttpResponse.json(
      {
        id: "generation-id",
        user_id: "mock-user-id",
        input_text: "Test input",
        status: "processing",
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
];
