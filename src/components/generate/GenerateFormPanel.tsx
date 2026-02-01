import { TextAreaCounter } from "./TextAreaCounter";
import { GenerateButton } from "./GenerateButton";

interface GenerateFormPanelProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MIN_LENGTH = 1000;
const MAX_LENGTH = 10000;

export function GenerateFormPanel({
  sourceText,
  onSourceTextChange,
  onGenerate,
  isLoading,
  disabled = false,
}: GenerateFormPanelProps) {
  const isValidLength = sourceText.length >= MIN_LENGTH && sourceText.length <= MAX_LENGTH;
  const isDisabled = disabled || !isValidLength || isLoading;

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg border shadow-sm">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Generate Flashcards</h2>
        <p className="text-sm text-muted-foreground">
          Paste your source text below to generate flashcard candidates using AI.
        </p>
      </div>

      <TextAreaCounter
        value={sourceText}
        onChange={onSourceTextChange}
        maxLength={MAX_LENGTH}
        minLength={MIN_LENGTH}
        disabled={disabled}
        placeholder="Paste your source text here (1,000 - 10,000 characters)..."
      />

      <div className="flex justify-end">
        <GenerateButton onClick={onGenerate} disabled={isDisabled} isLoading={isLoading} />
      </div>
    </div>
  );
}
