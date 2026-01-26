import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { GenerationStatus } from "./types";
import { cn } from "@/lib/utils";

interface GenerationStatusPanelProps {
  status: GenerationStatus;
  generationId: string | null;
  error: string | null;
  onCancel: () => void;
}

export function GenerationStatusPanel({
  status,
  generationId,
  error,
  onCancel,
}: GenerationStatusPanelProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(() => Date.now());

  // Update elapsed time every second while generating/polling
  useEffect(() => {
    if (status === "pending" || status === "polling") {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  // Reset elapsed time when status changes to idle
  useEffect(() => {
    if (status === "idle") {
      setElapsedTime(0);
    }
  }, [status]);

  // Don't render if idle
  if (status === "idle") {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          icon: <Loader2 className="animate-spin text-primary" />,
          title: "Starting generation...",
          description: "Preparing your request",
          color: "border-primary/20 bg-primary/5",
          showCancel: true,
        };
      case "polling":
        return {
          icon: <Loader2 className="animate-spin text-blue-500" />,
          title: "Generating flashcards...",
          description: "AI is analyzing your text and creating flashcard candidates",
          color: "border-blue-500/20 bg-blue-500/5",
          showCancel: true,
        };
      case "success":
        return {
          icon: <CheckCircle2 className="text-green-500" />,
          title: "Generation complete!",
          description: "Review and accept the flashcard candidates below",
          color: "border-green-500/20 bg-green-500/5",
          showCancel: false,
        };
      case "failed":
        return {
          icon: <XCircle className="text-destructive" />,
          title: "Generation failed",
          description: error || "An error occurred during generation",
          color: "border-destructive/20 bg-destructive/5",
          showCancel: false,
        };
      case "cancelled":
        return {
          icon: <X className="text-muted-foreground" />,
          title: "Generation cancelled",
          description: "The generation was cancelled by user",
          color: "border-border bg-muted/5",
          showCancel: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={cn(
        "relative p-6 rounded-lg border transition-all",
        config.color
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-base">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>

          {/* Generation ID and elapsed time */}
          {(status === "pending" || status === "polling") && (
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {generationId && (
                <span className="font-mono">ID: {generationId.substring(0, 8)}...</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatTime(elapsedTime)}
              </span>
            </div>
          )}
        </div>

        {/* Cancel button */}
        {config.showCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-shrink-0"
            aria-label="Cancel generation"
          >
            <X />
            Cancel
          </Button>
        )}
      </div>

      {/* Progress bar for polling */}
      {status === "polling" && (
        <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 animate-pulse"
            style={{
              width: `${Math.min((elapsedTime / 120) * 100, 100)}%`,
              transition: "width 1s linear",
            }}
          />
        </div>
      )}
    </div>
  );
}
