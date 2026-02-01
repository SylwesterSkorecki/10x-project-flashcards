import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { RegisterSchema } from "@/lib/schemas/auth.schema";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/db/supabase.client";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const formErrorId = useId();

  const validateForm = () => {
    try {
      RegisterSchema.parse({ email, password, confirmPassword });
      setEmailError(null);
      setPasswordError(null);
      setConfirmPasswordError(null);
      return true;
    } catch (error: any) {
      error.errors?.forEach((err: any) => {
        const field = err.path[0];
        const message = err.message;

        if (field === "email") setEmailError(message);
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
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.user.confirmed_at) {
        // Email confirmation required - show success message
        setSuccess(true);
      } else {
        // Auto-confirmed (local dev) - redirect to login
        window.location.href = "/auth/login?message=email_verified";
      }
    } catch (error: any) {
      const message = error.message?.toLowerCase() || "";

      if (message.includes("user already registered") || message.includes("already been registered")) {
        setFormError("Ten email jest już zarejestrowany. Spróbuj się zalogować.");
      } else if (message.includes("password") && message.includes("characters")) {
        setFormError("Hasło musi mieć co najmniej 10 znaków");
      } else if (message.includes("invalid")) {
        setFormError("Nieprawidłowy format emaila lub hasła");
      } else {
        setFormError("Wystąpił błąd podczas rejestracji. Spróbuj ponownie.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="size-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Sprawdź swoją skrzynkę pocztową</h2>
            <p className="text-muted-foreground">
              Wysłaliśmy link weryfikacyjny na adres <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Kliknij link w emailu, aby potwierdzić swoje konto i uzyskać dostęp do aplikacji.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <a href="/auth/login">Przejdź do logowania</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Utwórz konto</h1>
        <p className="text-muted-foreground">Wypełnij formularz aby rozpocząć naukę</p>
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
          <Label htmlFor={emailId}>
            Email
            <span className="text-destructive ml-1" aria-label="wymagane">
              *
            </span>
          </Label>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            placeholder="nazwa@przykład.pl"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? emailErrorId : undefined}
            className={cn(emailError && "border-destructive focus-visible:ring-destructive")}
            disabled={loading}
          />
          {emailError && (
            <p id={emailErrorId} role="alert" className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="size-3" />
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={passwordId}>
            Hasło
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
            Potwierdź hasło
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
              Tworzenie konta...
            </>
          ) : (
            "Zarejestruj się"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a href="/auth/login" className="text-primary hover:underline font-medium">
          Zaloguj się
        </a>
      </div>
    </div>
  );
}
