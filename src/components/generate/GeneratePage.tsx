import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useGenerateFlow } from "@/components/hooks/useGenerateFlow";
import { GenerateFormPanel } from "./GenerateFormPanel";
import { GenerationStatusPanel } from "./GenerationStatusPanel";
import { CandidatesList } from "./CandidatesList";
import { EditCandidateModal } from "./EditCandidateModal";
import { CommitResultModal } from "./CommitResultModal";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import type { BulkSaveResult } from "@/types";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function GeneratePageContent() {
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<BulkSaveResult | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const {
    sourceText,
    setSourceText,
    status,
    generationId,
    error,
    isGenerating,
    isPolling,
    candidates,
    acceptedCount,
    startGeneration,
    cancelGeneration,
    acceptCandidate,
    unacceptCandidate,
    editCandidate,
    rejectCandidate,
    commitAccepted,
  } = useGenerateFlow();

  const handleEdit = (candidateId: string) => {
    setEditingCandidateId(candidateId);
  };

  const handleSaveEdit = (candidateId: string, front: string, back: string) => {
    editCandidate(candidateId, front, back);
    setEditingCandidateId(null);
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      const result = await commitAccepted();
      if (result) {
        setCommitResult(result);
      }
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCloseCommitResult = () => {
    setCommitResult(null);
    // If all saved successfully, could reset form or redirect
    if (commitResult && commitResult.saved.length > 0 && commitResult.skipped.length === 0) {
      // Optional: reset form for new generation
      // setSourceText("");
    }
  };

  const handleRetrySkipped = () => {
    // Close modal and allow user to review/edit skipped candidates
    setCommitResult(null);
    // Skipped candidates are still in the list with their status
  };

  const showCandidates = status === "success" && candidates.length > 0;
  const isDisabled = isGenerating || isPolling;
  const editingCandidate = editingCandidateId ? candidates.find((c) => c.candidate_id === editingCandidateId) : null;

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">AI Flashcard Generator</h1>
            <p className="text-lg text-muted-foreground">
              Transform your study materials into effective flashcards using AI.
            </p>
          </div>

          {/* Form Panel */}
          <GenerateFormPanel
            sourceText={sourceText}
            onSourceTextChange={setSourceText}
            onGenerate={startGeneration}
            isLoading={isGenerating || isPolling}
            disabled={isDisabled}
          />

          {/* Status Panel */}
          <GenerationStatusPanel
            status={status}
            generationId={generationId}
            error={error}
            onCancel={cancelGeneration}
          />

          {/* Candidates Section */}
          {showCandidates && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Review Candidates</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} generated
                    {acceptedCount > 0 && ` • ${acceptedCount} accepted`}
                  </p>
                </div>
              </div>

              <CandidatesList
                candidates={candidates}
                onAccept={acceptCandidate}
                onUnaccept={unacceptCandidate}
                onEdit={handleEdit}
                onReject={rejectCandidate}
              />

              {/* Commit Bar - shown at bottom when candidates are accepted */}
              {acceptedCount > 0 && (
                <div className="sticky bottom-4 p-4 rounded-lg border bg-card shadow-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {acceptedCount} flashcard{acceptedCount !== 1 ? "s" : ""} ready to save
                      </p>
                      <p className="text-sm text-muted-foreground">Click save to add them to your collection</p>
                    </div>
                    <Button onClick={handleCommit} disabled={isCommitting} size="lg">
                      <Save />
                      {isCommitting ? "Saving..." : "Save Accepted"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <EditCandidateModal
        candidate={editingCandidate || null}
        isOpen={!!editingCandidateId}
        onClose={() => setEditingCandidateId(null)}
        onSave={handleSaveEdit}
      />

      <CommitResultModal
        result={commitResult}
        isOpen={!!commitResult}
        onClose={handleCloseCommitResult}
        onRetrySkipped={handleRetrySkipped}
      />

      {/* Toast notifications */}
      <Toaster />
    </>
  );
}

export default function GeneratePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <GeneratePageContent />
    </QueryClientProvider>
  );
}
