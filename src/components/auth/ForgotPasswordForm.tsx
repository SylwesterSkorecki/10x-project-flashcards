import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { ForgotPasswordSchema } from "@/lib/schemas/auth.schema";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/db/supabase.client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const emailId = useId();
  const emailErrorId = useId();
  const formErrorId = useId();

  const validateEmail = (value: string): boolean => {
    try {
      ForgotPasswordSchema.parse({ email: value });
      setEmailError(null);
      return true;
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setEmailError(error.errors?.[0]?.message || "Nieprawidłowy email");
      return false;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) throw error;

      // Always show success message (don't reveal if email exists or not)
      setSuccess(true);
    } catch {
      // For security, don't reveal if email exists
      // Always show success message (even on error)
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Mail className="size-16 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Sprawdź swoją skrzynkę pocztową</h2>
            <p className="text-muted-foreground">
              Jeśli konto o tym emailu istnieje, wysłaliśmy link do resetowania hasła na adres <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Link jest ważny przez 1 godzinę.</p>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button asChild>
              <a href="/auth/login">Wróć do logowania</a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
            >
              Wyślij ponownie
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Resetowanie hasła</h1>
        <p className="text-muted-foreground">Wpisz swój adres email, a wyślemy Ci link do ustawienia nowego hasła</p>
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
            onChange={handleEmailChange}
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Wysyłanie...
            </>
          ) : (
            "Wyślij link resetujący"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Pamiętasz hasło? </span>
        <a href="/auth/login" className="text-primary hover:underline font-medium">
          Zaloguj się
        </a>
      </div>
    </div>
  );
}
