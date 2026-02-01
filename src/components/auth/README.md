# Komponenty autentykacji

Ten katalog zawiera komponenty React odpowiedzialne za interfejs użytkownika procesu autentykacji.

## Komponenty

### LoginForm

**Lokalizacja:** `LoginForm.tsx`

Formularz logowania użytkownika.

**Props:**

- `returnTo?: string` - URL do którego użytkownik zostanie przekierowany po zalogowaniu

**Funkcjonalność:**

- Walidacja emaila i hasła (Zod)
- Wyświetlanie błędów walidacji w czasie rzeczywistym
- Obsługa komunikatów błędów z Supabase
- Stan ładowania podczas wysyłania formularza
- Linki do rejestracji i resetowania hasła

**TODO dla implementacji backend:**

- Zintegrować z `supabaseClient.auth.signInWithPassword()`
- Obsłużyć przekierowanie po sukcesie
- Zaimplementować mapowanie błędów Supabase

### RegisterForm

**Lokalizacja:** `RegisterForm.tsx`

Formularz rejestracji nowego użytkownika.

**Props:** Brak

**Funkcjonalność:**

- Pola: email, hasło, potwierdzenie hasła
- Walidacja złożoności hasła (min. 10 znaków, wielka/mała litera, cyfra)
- Sprawdzanie zgodności haseł
- Ekran sukcesu z informacją o wysłaniu emaila weryfikacyjnego
- Link do logowania

**TODO dla implementacji backend:**

- Zintegrować z `supabaseClient.auth.signUp()`
- Skonfigurować `emailRedirectTo` dla weryfikacji emaila

### ForgotPasswordForm

**Lokalizacja:** `ForgotPasswordForm.tsx`

Formularz żądania resetu hasła.

**Props:** Brak

**Funkcjonalność:**

- Pole emaila
- Walidacja formatu emaila
- Ekran sukcesu z informacją o wysłaniu linku
- Opcja wysłania linku ponownie
- Komunikat bezpieczeństwa (nie ujawnia czy konto istnieje)

**TODO dla implementacji backend:**

- Zintegrować z `supabaseClient.auth.resetPasswordForEmail()`
- Skonfigurować `redirectTo` dla strony reset-password

### ResetPasswordForm

**Lokalizacja:** `ResetPasswordForm.tsx`

Formularz ustawiania nowego hasła po kliknięciu linku z emaila.

**Props:** Brak

**Funkcjonalność:**

- Pola: nowe hasło, potwierdzenie nowego hasła
- Walidacja złożoności hasła
- Stan ładowania podczas aktualizacji

**TODO dla implementacji backend:**

- Zintegrować z `supabaseClient.auth.updateUser({ password })`
- Obsłużyć przekierowanie do logowania po sukcesie
- Sprawdzić ważność tokenu weryfikacyjnego z URL

## Walidacja

Wszystkie formularze używają schematów Zod zdefiniowanych w `@/lib/schemas/auth.schema.ts`:

- `LoginSchema` - email i hasło (min. 10 znaków)
- `RegisterSchema` - email, hasło z wymaganiami bezpieczeństwa, potwierdzenie hasła
- `ForgotPasswordSchema` - email
- `ResetPasswordSchema` - hasło z wymaganiami bezpieczeństwa, potwierdzenie hasła

## Styl i design

Komponenty używają:

- Shadcn/ui dla podstawowych komponentów (Button, Input, Label, Dialog)
- Tailwind CSS dla stylowania
- Lucide React dla ikon
- Spójny design system z resztą aplikacji

**Wzorowane na:** `EditCandidateModal.tsx` i `CommitResultModal.tsx`

## Integracja z backend

Obecnie wszystkie wywołania API są zakomentowane i zawierają placeholder logic.

**Aby zintegrować z Supabase:**

1. Utworzyć klienta Supabase (`src/db/supabase.client.ts`)
2. Odkomentować TODO w każdym komponencie
3. Zaimplementować obsługę błędów Supabase
4. Skonfigurować email templates w Supabase Dashboard
5. Dodać zmienne środowiskowe (SUPABASE_URL, SUPABASE_KEY)

## Dostępność (Accessibility)

Wszystkie formularze implementują:

- Semantyczne HTML
- ARIA labels i opisы
- Prawidłowe powiązania label-input
- Role dla komunikatów błędów (role="alert")
- Wsparcie dla czytników ekranu
- Focus management

## Użycie

```tsx
import { LoginForm } from "@/components/auth";

// W komponencie Astro:
<LoginForm client:load returnTo="/generate" />;
```

```tsx
import { RegisterForm } from "@/components/auth";

<RegisterForm client:load />;
```
