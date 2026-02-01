import { useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { LoginSchema } from "@/lib/schemas/auth.schema";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/db/supabase.client";

interface LoginFormProps {
  returnTo?: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const formErrorId = useId();

  const validateEmail = (value: string): boolean => {
    try {
      LoginSchema.shape.email.parse(value);
      setEmailError(null);
      return true;
    } catch (error: any) {
      setEmailError(error.errors[0]?.message || "Nieprawidłowy email");
      return false;
    }
  };

  const validatePassword = (value: string): boolean => {
    try {
      LoginSchema.shape.password.parse(value);
      setPasswordError(null);
      return true;
    } catch (error: any) {
      setPasswordError(error.errors[0]?.message || "Nieprawidłowe hasło");
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError) {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if email is confirmed (required for login)
      if (data.user && !data.user.email_confirmed_at) {
        setFormError("Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.");
        // Sign out the user since we require email verification
        await supabaseClient.auth.signOut();
        return;
      }

      // Successful login - redirect to returnTo or /generate
      const redirectUrl = returnTo || "/generate";
      window.location.href = redirectUrl;
    } catch (error: any) {
      // Map Supabase errors to user-friendly messages
      const message = error.message?.toLowerCase() || "";

      if (message.includes("invalid login credentials")) {
        setFormError("Nieprawidłowy email lub hasło");
      } else if (message.includes("email not confirmed")) {
        setFormError("Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.");
      } else if (message.includes("invalid")) {
        setFormError("Nieprawidłowy email lub hasło");
      } else {
        setFormError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Zaloguj się</h1>
        <p className="text-muted-foreground">Wpisz swoje dane aby uzyskać dostęp do konta</p>
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
            onChange={handlePasswordChange}
            placeholder="Wpisz hasło"
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
        </div>

        <div className="flex items-center justify-end">
          <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">
            Zapomniałeś hasła?
          </a>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Logowanie...
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz konta? </span>
        <a href="/auth/register" className="text-primary hover:underline font-medium">
          Zarejestruj się
        </a>
      </div>
    </div>
  );
}
