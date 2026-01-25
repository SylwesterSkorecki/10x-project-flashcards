import { z } from "zod";

export const FlashcardSourceEnum = z.enum(["ai-full", "ai-edited", "manual"]);

export const CreateFlashcardSchema = z.object({
  front: z.string().min(1, "Front nie może być pusty").max(200, "Front może zawierać maksymalnie 200 znaków"),
  back: z.string().min(1, "Back nie może być pusty").max(500, "Back może zawierać maksymalnie 500 znaków"),
  source: FlashcardSourceEnum,
  generation_id: z.string().uuid().nullable().optional(),
});

export type CreateFlashcardInput = z.infer<typeof CreateFlashcardSchema>;

export const UpdateFlashcardSchema = z
  .object({
    front: z
      .string()
      .min(1, "Front nie może być pusty")
      .max(200, "Front może zawierać maksymalnie 200 znaków")
      .optional(),
    back: z.string().min(1, "Back nie może być pusty").max(500, "Back może zawierać maksymalnie 500 znaków").optional(),
    source: FlashcardSourceEnum.optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined || data.source !== undefined, {
    message: "Co najmniej jedno pole (front, back lub source) musi być dostarczone",
  });

export type UpdateFlashcardInput = z.infer<typeof UpdateFlashcardSchema>;
