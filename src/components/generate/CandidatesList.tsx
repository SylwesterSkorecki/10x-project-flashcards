import { CandidateCard } from "./CandidateCard";
import type { EditedCandidateViewModel } from "./types";

interface CandidatesListProps {
  candidates: EditedCandidateViewModel[];
  onAccept: (candidateId: string) => void;
  onUnaccept: (candidateId: string) => void;
  onEdit: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}

export function CandidatesList({ candidates, onAccept, onUnaccept, onEdit, onReject }: CandidatesListProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground">No candidates to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="list" aria-label="Flashcard candidates">
      {candidates.map((candidate) => (
        <div key={candidate.candidate_id} role="listitem">
          <CandidateCard
            candidate={candidate}
            onAccept={onAccept}
            onUnaccept={onUnaccept}
            onEdit={onEdit}
            onReject={onReject}
          />
        </div>
      ))}
    </div>
  );
}
