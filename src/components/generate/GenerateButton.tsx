import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export function GenerateButton({ onClick, disabled, isLoading }: GenerateButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled || isLoading} size="lg" className="w-full sm:w-auto">
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles />
          Generate Flashcards
        </>
      )}
    </Button>
  );
}
