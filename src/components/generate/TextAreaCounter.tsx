import { useId, type ChangeEvent, type FocusEvent } from "react";
import { cn } from "@/lib/utils";

interface TextAreaCounterProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  minLength: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TextAreaCounter({
  value,
  onChange,
  maxLength,
  minLength,
  placeholder = "Paste your source text here...",
  disabled = false,
  className,
}: TextAreaCounterProps) {
  const textareaId = useId();
  const counterId = useId();
  const errorId = useId();

  const currentLength = value.length;
  const isTooShort = currentLength > 0 && currentLength < minLength;
  const isTooLong = currentLength > maxLength;
  const isValid = currentLength >= minLength && currentLength <= maxLength;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Prevent input beyond maxLength
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const newValue = value + pastedText;
    
    // If paste would exceed maxLength, truncate
    if (newValue.length > maxLength) {
      e.preventDefault();
      onChange(newValue.slice(0, maxLength));
    }
  };

  const getCounterColor = () => {
    if (isTooLong) return "text-destructive";
    if (isTooShort) return "text-yellow-600 dark:text-yellow-500";
    if (isValid) return "text-green-600 dark:text-green-500";
    return "text-muted-foreground";
  };

  const getErrorMessage = () => {
    if (isTooLong) {
      return `Text is too long. Maximum ${maxLength.toLocaleString()} characters allowed.`;
    }
    if (isTooShort) {
      return `Text is too short. Minimum ${minLength.toLocaleString()} characters required.`;
    }
    return null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <textarea
          id={textareaId}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={`${counterId} ${errorId}`}
          aria-invalid={isTooShort || isTooLong}
          className={cn(
            "w-full min-h-[240px] px-4 py-3 rounded-md border bg-background",
            "text-sm font-mono leading-relaxed resize-y",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            (isTooShort || isTooLong) && "border-destructive focus:ring-destructive",
            isValid && "border-green-500 focus:ring-green-500"
          )}
        />
        
        {/* Counter badge */}
        <div
          id={counterId}
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            "absolute bottom-3 right-3 px-2.5 py-1 rounded-md",
            "text-xs font-medium tabular-nums",
            "bg-background/80 backdrop-blur-sm border shadow-sm",
            getCounterColor()
          )}
        >
          {currentLength.toLocaleString()} / {maxLength.toLocaleString()}
        </div>
      </div>

      {/* Error/Warning message */}
      {getErrorMessage() && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className={cn(
            "text-sm font-medium px-1",
            isTooLong ? "text-destructive" : "text-yellow-600 dark:text-yellow-500"
          )}
        >
          {getErrorMessage()}
        </p>
      )}

      {/* Helper text when valid */}
      {!getErrorMessage() && currentLength === 0 && (
        <p className="text-sm text-muted-foreground px-1">
          Enter between {minLength.toLocaleString()} and {maxLength.toLocaleString()} characters to generate flashcards.
        </p>
      )}
    </div>
  );
}
