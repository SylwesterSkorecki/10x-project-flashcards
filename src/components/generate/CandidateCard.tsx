import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Edit, X, ChevronDown, ChevronUp, Star } from "lucide-react";
import type { EditedCandidateViewModel } from "./types";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
  candidate: EditedCandidateViewModel;
  onAccept: (candidateId: string) => void;
  onUnaccept: (candidateId: string) => void;
  onEdit: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}

export function CandidateCard({
  candidate,
  onAccept,
  onUnaccept,
  onEdit,
  onReject,
}: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAccepted = candidate.status === "accepted" || candidate.status === "edited";
  const isEdited = candidate.status === "edited";

  const handleAccept = () => {
    if (isAccepted) {
      // Toggle back to pending if already accepted
      onUnaccept(candidate.candidate_id);
    } else {
      onAccept(candidate.candidate_id);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 dark:text-green-500";
    if (score >= 0.6) return "text-yellow-600 dark:text-yellow-500";
    return "text-orange-600 dark:text-orange-500";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800";
    if (score >= 0.6) return "bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800";
    return "bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800";
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all",
        isAccepted
          ? "border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      {/* Header: Score and Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {/* Score badge */}
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium",
              getScoreBadgeColor(candidate.score)
            )}
          >
            <Star className={cn("size-3", getScoreColor(candidate.score))} />
            <span className={getScoreColor(candidate.score)}>
              {(candidate.score * 100).toFixed(0)}%
            </span>
          </div>

          {/* Edited badge */}
          {isEdited && (
            <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-300 dark:border-blue-800">
              Edited
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAccept}
            className={cn(
              "h-8 px-2",
              isAccepted && "bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20"
            )}
            aria-label={isAccepted ? "Remove acceptance" : "Accept candidate"}
            title={isAccepted ? "Remove acceptance" : "Accept"}
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(candidate.candidate_id)}
            className="h-8 px-2"
            aria-label="Edit candidate"
            title="Edit"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReject(candidate.candidate_id)}
            className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Reject candidate"
            title="Reject"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Front (Question) */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Front (Question)
        </h4>
        <p className="text-sm leading-relaxed">{candidate.front}</p>
      </div>

      {/* Divider */}
      <div className="my-3 border-t" />

      {/* Back (Answer) - Expandable */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Back (Answer)
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                Expand
              </>
            )}
          </Button>
        </div>
        <p
          className={cn(
            "text-sm leading-relaxed transition-all",
            !isExpanded && "line-clamp-2"
          )}
        >
          {candidate.back}
        </p>
      </div>

      {/* Accepted indicator */}
      {isAccepted && (
        <div className="absolute top-2 left-2 size-3 rounded-full bg-green-500" aria-hidden="true" />
      )}
    </div>
  );
}
