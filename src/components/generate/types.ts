import type { GenerationCandidate } from "@/types";

/**
 * Extended candidate with local editing status
 */
export interface EditedCandidateViewModel extends GenerationCandidate {
  candidate_id: string;
  front: string;
  back: string;
  score: number;
  source: "ai-full" | "ai-edited";
  status: "pending" | "accepted" | "edited" | "rejected";
}

/**
 * Overall state of the generate view
 */
export interface GenerateViewState {
  source_text: string;
  generationId?: string;
  status: "idle" | "pending" | "polling" | "success" | "failed";
  candidates: EditedCandidateViewModel[];
  acceptedCount: number;
  cooldownUntil?: number; // timestamp
  error?: string;
}

/**
 * Generation status for UI display
 */
export type GenerationStatus = "idle" | "pending" | "polling" | "success" | "failed" | "cancelled";
