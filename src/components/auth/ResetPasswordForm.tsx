import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { ResetPasswordSchema } from "@/lib/schemas/auth.schema";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/db/supabase.client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordId = useId();
  const confirmPasswordId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const formErrorId = useId();

  const validateForm = () => {
    try {
      ResetPasswordSchema.parse({ password, confirmPassword });
      setPasswordError(null);
      setConfirmPasswordError(null);
      return true;
    } catch (error: any) {
      error.errors?.forEach((err: any) => {
        const field = err.path[0];
        const message = err.message;

        if (field === "password") setPasswordError(message);
        if (field === "confirmPassword") setConfirmPasswordError(message);
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Password updated successfully - redirect to login
      window.location.href = "/auth/login?message=password_reset_success";
    } catch (error: any) {
      const message = error.message?.toLowerCase() || "";

      if (message.includes("same") || message.includes("similar")) {
        setFormError("Nowe hasło musi być inne niż poprzednie");
      } else if (message.includes("session") || message.includes("token")) {
        setFormError("Link wygasł. Poproś o nowy link resetujący hasło.");
      } else {
        setFormError("Wystąpił błąd. Spróbuj ponownie lub poproś o nowy link.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Ustaw nowe hasło</h1>
        <p className="text-muted-foreground">Wprowadź nowe hasło do swojego konta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div id={formErrorId} role="alert" className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 flex-shrink-0" />
              {formError}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={passwordId}>
            Nowe hasło
            <span className="text-destructive ml-1" aria-label="wymagane">
              *
            </span>
          </Label>
          <Input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            placeholder="Minimum 10 znaków"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? passwordErrorId : undefined}
            className={cn(passwordError && "border-destructive focus-visible:ring-destructive")}
            disabled={loading}
          />
          {passwordError && (
            <p id={passwordErrorId} role="alert" className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="size-3" />
              {passwordError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Hasło musi zawierać co najmniej 10 znaków, w tym wielką literę, małą literę i cyfrę
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={confirmPasswordId}>
            Potwierdź nowe hasło
            <span className="text-destructive ml-1" aria-label="wymagane">
              *
            </span>
          </Label>
          <Input
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmPasswordError) setConfirmPasswordError(null);
            }}
            placeholder="Wpisz hasło ponownie"
            aria-invalid={!!confirmPasswordError}
            aria-describedby={confirmPasswordError ? confirmPasswordErrorId : undefined}
            className={cn(confirmPasswordError && "border-destructive focus-visible:ring-destructive")}
            disabled={loading}
          />
          {confirmPasswordError && (
            <p id={confirmPasswordErrorId} role="alert" className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="size-3" />
              {confirmPasswordError}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Aktualizacja hasła...
            </>
          ) : (
            "Ustaw nowe hasło"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <a href="/auth/login" className="text-primary hover:underline font-medium">
          Wróć do logowania
        </a>
      </div>
    </div>
  );
}
