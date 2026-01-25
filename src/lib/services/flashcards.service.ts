import type { SupabaseClient } from "../../db/supabase.client";
import type { UpdateFlashcardCommand, FlashcardDTO } from "../../types";

/**
 * Service layer for flashcard operations.
 * Provides business logic and data access methods for flashcards.
 */
export class FlashcardsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves a single flashcard by ID for a specific user.
   * Ensures ownership by filtering on user_id.
   *
   * @param userId - The ID of the user who owns the flashcard
   * @param cardId - The ID of the flashcard to retrieve
   * @returns The flashcard DTO or null if not found
   */
  async getFlashcard(userId: string, cardId: string): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .eq("id", cardId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as FlashcardDTO;
  }

  /**
   * Updates a flashcard with new data.
   * Implements defense-in-depth by checking ownership before attempting update.
   * RLS policies provide additional security at the database level.
   *
   * @param userId - The ID of the user who owns the flashcard
   * @param cardId - The ID of the flashcard to update
   * @param updateData - The fields to update (front, back, and/or source)
   * @returns The updated flashcard DTO or null if not found/unauthorized
   * @throws Error if database operation fails (e.g., unique constraint violation)
   */
  async updateFlashcard(
    userId: string,
    cardId: string,
    updateData: UpdateFlashcardCommand
  ): Promise<FlashcardDTO | null> {
    // Guard: Check flashcard exists and belongs to user (defense in depth)
    const existing = await this.getFlashcard(userId, cardId);
    if (!existing) {
      return null;
    }

    // Prepare update data with timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Execute update with RLS enforcement
    // RLS policies ensure only the owner can update, providing an additional security layer
    const { data: updated, error } = await this.supabase
      .from("flashcards")
      .update(updatePayload)
      .eq("id", cardId)
      .eq("user_id", userId)
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return updated as FlashcardDTO;
  }
}
