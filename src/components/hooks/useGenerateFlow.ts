import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type {
  CreateGenerationCommand,
  CreateGenerationResponseSync,
  CreateGenerationResponseAsync,
  GenerationDTO,
  CommitGenerationCommand,
  BulkSaveResult,
} from "@/types";
import type { EditedCandidateViewModel, GenerationStatus } from "../generate/types";

interface UseGenerateFlowReturn {
  // State
  sourceText: string;
  generationId: string | null;
  status: GenerationStatus;
  candidates: EditedCandidateViewModel[];
  error: string | null;
  isGenerating: boolean;
  isPolling: boolean;

  // Actions
  setSourceText: (text: string) => void;
  startGeneration: () => Promise<void>;
  cancelGeneration: () => void;
  acceptCandidate: (candidateId: string) => void;
  unacceptCandidate: (candidateId: string) => void;
  editCandidate: (candidateId: string, front: string, back: string) => void;
  rejectCandidate: (candidateId: string) => void;
  commitAccepted: () => Promise<BulkSaveResult | null>;

  // Computed
  acceptedCandidates: EditedCandidateViewModel[];
  acceptedCount: number;
}

const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 60; // 2 minutes max

export function useGenerateFlow(): UseGenerateFlowReturn {
  const queryClient = useQueryClient();
  const [sourceText, setSourceText] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [candidates, setCandidates] = useState<EditedCandidateViewModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollingAttemptsRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mutation: Start generation (POST /api/generations)
  const generateMutation = useMutation({
    mutationFn: async (command: CreateGenerationCommand) => {
      abortControllerRef.current = new AbortController();
      return apiClient.post<CreateGenerationResponseSync | CreateGenerationResponseAsync>(
        "/generations",
        command,
        abortControllerRef.current.signal
      );
    },
    onSuccess: (response) => {
      setError(null);

      // Check if sync (200) or async (202)
      if ("candidates" in response) {
        // Synchronous response with candidates
        const syncResponse = response as CreateGenerationResponseSync;
        setGenerationId(syncResponse.generation_id);
        const mappedCandidates: EditedCandidateViewModel[] = syncResponse.candidates.map((c) => ({
          ...c,
          source: "ai-full" as const,
          status: "pending" as const,
        }));
        setCandidates(mappedCandidates);
        setStatus("success");
        toast.success(`Generated ${syncResponse.generated_count} flashcard candidates`);
      } else {
        // Asynchronous response - start polling
        const asyncResponse = response as CreateGenerationResponseAsync;
        setGenerationId(asyncResponse.generation_id);
        setStatus("polling");
        pollingAttemptsRef.current = 0;
        toast.info("Generation started, please wait...");
      }
    },
    onError: (err: unknown) => {
      handleError(err);
      setStatus("failed");
    },
  });

  // Query: Poll generation status (GET /api/generations/:id)
  const { data: generationData } = useQuery({
    queryKey: ["generation", generationId],
    queryFn: async () => {
      if (!generationId) return null;
      pollingAttemptsRef.current += 1;
      return apiClient.get<GenerationDTO>(`/generations/${generationId}`);
    },
    enabled: status === "polling" && !!generationId,
    refetchInterval: (query) => {
      // Stop polling if we have candidates or exceeded max attempts
      if (query.state.data?.candidates || pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
        return false;
      }
      return POLLING_INTERVAL;
    },
    retry: false,
  });

  // Effect: Handle polling result
  if (status === "polling" && generationData?.candidates) {
    const mappedCandidates: EditedCandidateViewModel[] = generationData.candidates.map((c) => ({
      ...c,
      source: "ai-full" as const,
      status: "pending" as const,
    }));
    setCandidates(mappedCandidates);
    setStatus("success");
    toast.success(`Generated ${mappedCandidates.length} flashcard candidates`);
  }

  // Effect: Handle polling timeout
  if (status === "polling" && pollingAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
    const errorMsg = "Generation timed out. Please try again.";
    setError(errorMsg);
    setStatus("failed");
    toast.error(errorMsg);
  }

  // Mutation: Commit accepted candidates
  const commitMutation = useMutation({
    mutationFn: async (command: CommitGenerationCommand) => {
      if (!generationId) throw new Error("No generation ID");
      return apiClient.post<BulkSaveResult>(`/generations/${generationId}/commit`, command);
    },
    onSuccess: (result) => {
      // Invalidate flashcards cache
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });

      // Show success toast
      if (result.saved.length > 0 && result.skipped.length === 0) {
        toast.success(`Saved ${result.saved.length} flashcard${result.saved.length !== 1 ? "s" : ""}`);
      } else if (result.saved.length > 0 && result.skipped.length > 0) {
        toast.warning(`Saved ${result.saved.length}, skipped ${result.skipped.length}`);
      } else if (result.skipped.length > 0) {
        toast.error(`All ${result.skipped.length} flashcard${result.skipped.length !== 1 ? "s were" : " was"} skipped`);
      }
    },
    onError: (err: unknown) => {
      handleError(err);
      toast.error("Failed to save flashcards");
    },
  });

  // Actions
  const startGeneration = useCallback(async () => {
    if (!sourceText || sourceText.length < 1000 || sourceText.length > 10000) {
      setError("Source text must be between 1,000 and 10,000 characters");
      return;
    }

    setStatus("pending");
    setError(null);
    setCandidates([]);
    setGenerationId(null);

    const command: CreateGenerationCommand = {
      source_text: sourceText,
    };

    await generateMutation.mutateAsync(command);
  }, [sourceText, generateMutation]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setError(null);
  }, []);

  const acceptCandidate = useCallback((candidateId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.candidate_id === candidateId ? { ...c, status: "accepted" as const } : c))
    );
  }, []);

  const unacceptCandidate = useCallback((candidateId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.candidate_id === candidateId ? { ...c, status: "pending" as const } : c))
    );
  }, []);

  const editCandidate = useCallback((candidateId: string, front: string, back: string) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.candidate_id === candidateId
          ? { ...c, front, back, source: "ai-edited" as const, status: "edited" as const }
          : c
      )
    );
  }, []);

  const rejectCandidate = useCallback((candidateId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.candidate_id === candidateId ? { ...c, status: "rejected" as const } : c))
    );
  }, []);

  const commitAccepted = useCallback(async (): Promise<BulkSaveResult | null> => {
    const accepted = candidates.filter((c) => c.status === "accepted" || c.status === "edited");

    if (accepted.length === 0) {
      setError("No candidates accepted");
      return null;
    }

    const command: CommitGenerationCommand = {
      accepted: accepted.map((c) => ({
        candidate_id: c.candidate_id,
        front: c.front,
        back: c.back,
        source: c.source,
      })),
    };

    const result = await commitMutation.mutateAsync(command);
    return result;
  }, [candidates, commitMutation]);

  // Error handler
  const handleError = (err: unknown) => {
    let errorMessage = "An unexpected error occurred";

    if (err instanceof ApiClientError) {
      if (err.isRateLimitError()) {
        errorMessage = "Rate limit exceeded. Please try again later.";
        toast.error(errorMessage, { duration: 5000 });
      } else if (err.isUnauthorized()) {
        errorMessage = "Unauthorized. Please log in again.";
        toast.error(errorMessage);
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = "/auth/login?returnTo=/generate";
        }, 2000);
      } else if (err.isServerError()) {
        errorMessage = "Server error. Please try again later.";
        toast.error(errorMessage, {
          description: "If the problem persists, please contact support.",
          duration: 6000,
        });
      } else {
        errorMessage = err.message;
        toast.error(errorMessage);
      }
    } else if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = "Request was cancelled";
        toast.info(errorMessage);
      } else {
        errorMessage = err.message;
        toast.error(errorMessage);
      }
    } else {
      toast.error(errorMessage);
    }

    setError(errorMessage);
  };

  // Computed values
  const acceptedCandidates = candidates.filter((c) => c.status === "accepted" || c.status === "edited");
  const acceptedCount = acceptedCandidates.length;

  return {
    // State
    sourceText,
    generationId,
    status,
    candidates: candidates.filter((c) => c.status !== "rejected"), // Hide rejected
    error,
    isGenerating: status === "pending",
    isPolling: status === "polling",

    // Actions
    setSourceText,
    startGeneration,
    cancelGeneration,
    acceptCandidate,
    unacceptCandidate,
    editCandidate,
    rejectCandidate,
    commitAccepted,

    // Computed
    acceptedCandidates,
    acceptedCount,
  };
}
