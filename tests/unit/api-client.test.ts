import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

/**
 * Example test demonstrating how to test API calls with MSW
 * 
 * MSW intercepts HTTP requests and returns mock responses,
 * allowing you to test API integration without hitting real endpoints.
 */

describe('API Client with MSW', () => {
  describe('Flashcards API', () => {
    it('should fetch flashcards successfully', async () => {
      const response = await fetch('/api/flashcards');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('question');
      expect(data[0]).toHaveProperty('answer');
    });

    it('should create a new flashcard', async () => {
      const newFlashcard = {
        question: 'Test Question',
        answer: 'Test Answer',
        category: 'Test',
      };

      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlashcard),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.question).toBe('New Question');
    });

    it('should handle API errors', async () => {
      // Override the default handler for this specific test
      server.use(
        http.get('/api/flashcards', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/flashcards');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('Generations API', () => {
    it('should create a generation request', async () => {
      const generationData = {
        input_text: 'Test input for generation',
      };

      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.status).toBe('processing');
    });
  });

  describe('OpenRouter Integration', () => {
    it('should generate flashcards via OpenRouter', async () => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'user', content: 'Generate flashcards about TypeScript' },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('choices');
      expect(data.choices[0].message.content).toBeTruthy();
    });
  });
});
