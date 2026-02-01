import { useState, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import type { EditedCandidateViewModel } from "./types";
import { cn } from "@/lib/utils";

interface EditCandidateModalProps {
  candidate: EditedCandidateViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (candidateId: string, front: string, back: string) => void;
}

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

export function EditCandidateModal({ candidate, isOpen, onClose, onSave }: EditCandidateModalProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);

  const frontId = useId();
  const backId = useId();
  const frontErrorId = useId();
  const backErrorId = useId();

  // Initialize form when candidate changes
  useEffect(() => {
    if (candidate) {
      setFront(candidate.front);
      setBack(candidate.back);
      setFrontError(null);
      setBackError(null);
    }
  }, [candidate]);

  // Validate front field
  const validateFront = (value: string): boolean => {
    if (!value.trim()) {
      setFrontError("Front side cannot be empty");
      return false;
    }
    if (value.length > MAX_FRONT_LENGTH) {
      setFrontError(`Front side must be ${MAX_FRONT_LENGTH} characters or less`);
      return false;
    }
    setFrontError(null);
    return true;
  };

  // Validate back field
  const validateBack = (value: string): boolean => {
    if (!value.trim()) {
      setBackError("Back side cannot be empty");
      return false;
    }
    if (value.length > MAX_BACK_LENGTH) {
      setBackError(`Back side must be ${MAX_BACK_LENGTH} characters or less`);
      return false;
    }
    setBackError(null);
    return true;
  };

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFront(value);
    if (frontError) {
      validateFront(value);
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBack(value);
    if (backError) {
      validateBack(value);
    }
  };

  const handleSave = () => {
    const isFrontValid = validateFront(front);
    const isBackValid = validateBack(back);

    if (!isFrontValid || !isBackValid || !candidate) {
      return;
    }

    onSave(candidate.candidate_id, front.trim(), back.trim());
    handleClose();
  };

  const handleClose = () => {
    // Reset form state
    setFront("");
    setBack("");
    setFrontError(null);
    setBackError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    // Close on Escape (Dialog handles this by default, but we want to reset state)
    if (e.key === "Escape") {
      handleClose();
    }
  };

  if (!candidate) return null;

  const frontRemaining = MAX_FRONT_LENGTH - front.length;
  const backRemaining = MAX_BACK_LENGTH - back.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Modify the front and back of this flashcard. Changes will be marked as edited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Front field */}
          <div className="space-y-2">
            <Label htmlFor={frontId}>
              Front (Question)
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            </Label>
            <Input
              id={frontId}
              value={front}
              onChange={handleFrontChange}
              placeholder="Enter the question or prompt"
              aria-invalid={!!frontError}
              aria-describedby={frontError ? frontErrorId : undefined}
              className={cn(frontError && "border-destructive focus-visible:ring-destructive")}
              maxLength={MAX_FRONT_LENGTH}
            />
            <div className="flex items-center justify-between gap-2">
              {frontError ? (
                <p id={frontErrorId} role="alert" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {frontError}
                </p>
              ) : (
                <div />
              )}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  frontRemaining < 20 ? "text-destructive" : "text-muted-foreground"
                )}
                aria-live="polite"
              >
                {frontRemaining} remaining
              </span>
            </div>
          </div>

          {/* Back field */}
          <div className="space-y-2">
            <Label htmlFor={backId}>
              Back (Answer)
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            </Label>
            <Textarea
              id={backId}
              value={back}
              onChange={handleBackChange}
              placeholder="Enter the answer or explanation"
              aria-invalid={!!backError}
              aria-describedby={backError ? backErrorId : undefined}
              className={cn("min-h-[120px] resize-y", backError && "border-destructive focus-visible:ring-destructive")}
              maxLength={MAX_BACK_LENGTH}
            />
            <div className="flex items-center justify-between gap-2">
              {backError ? (
                <p id={backErrorId} role="alert" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {backError}
                </p>
              ) : (
                <div />
              )}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  backRemaining < 50 ? "text-destructive" : "text-muted-foreground"
                )}
                aria-live="polite"
              >
                {backRemaining} remaining
              </span>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">Cmd</kbd> +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">Enter</kbd> to save
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!frontError || !!backError}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
