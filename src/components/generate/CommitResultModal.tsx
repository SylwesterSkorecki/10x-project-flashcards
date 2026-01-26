import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { BulkSaveResult } from "@/types";
import { cn } from "@/lib/utils";

interface CommitResultModalProps {
  result: BulkSaveResult | null;
  isOpen: boolean;
  onClose: () => void;
  onRetrySkipped?: () => void;
}

export function CommitResultModal({
  result,
  isOpen,
  onClose,
  onRetrySkipped,
}: CommitResultModalProps) {
  if (!result) return null;

  const { saved, skipped } = result;
  const hasSkipped = skipped.length > 0;
  const hasSaved = saved.length > 0;
  const allSkipped = skipped.length > 0 && saved.length === 0;

  const getTitle = () => {
    if (allSkipped) return "All Flashcards Skipped";
    if (hasSkipped) return "Flashcards Partially Saved";
    return "Flashcards Saved Successfully";
  };

  const getDescription = () => {
    if (allSkipped) {
      return "None of the flashcards could be saved. Please review the issues below.";
    }
    if (hasSkipped) {
      return `${saved.length} flashcard${saved.length !== 1 ? "s" : ""} saved successfully, but ${skipped.length} ${skipped.length !== 1 ? "were" : "was"} skipped.`;
    }
    return `${saved.length} flashcard${saved.length !== 1 ? "s" : ""} added to your collection.`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {allSkipped ? (
              <XCircle className="size-5 text-destructive" />
            ) : hasSkipped ? (
              <AlertTriangle className="size-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="size-5 text-green-500" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Saved items */}
          {hasSaved && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <h3 className="font-semibold text-sm">
                  Saved ({saved.length})
                </h3>
              </div>
              <div className="space-y-2">
                {saved.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-md bg-green-500/5 border border-green-500/20"
                  >
                    <p className="text-sm leading-relaxed">{item.front}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped items */}
          {hasSkipped && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-destructive" />
                <h3 className="font-semibold text-sm">
                  Skipped ({skipped.length})
                </h3>
              </div>
              <div className="space-y-2">
                {skipped.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-md bg-destructive/5 border border-destructive/20 space-y-1"
                  >
                    <p className="text-sm leading-relaxed font-medium">
                      {item.front}
                    </p>
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="size-3 mt-0.5 flex-shrink-0" />
                      <span>{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={cn(hasSkipped && onRetrySkipped && "justify-between")}>
          {hasSkipped && onRetrySkipped && (
            <Button variant="outline" onClick={onRetrySkipped}>
              Review Skipped
            </Button>
          )}
          <Button onClick={onClose}>
            {hasSaved ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
