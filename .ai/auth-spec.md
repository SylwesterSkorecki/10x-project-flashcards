# Specyfikacja techniczna architektury autentykacji - SmartFlash

## Wprowadzenie

Niniejszy dokument przedstawia szczegółową architekturę systemu autentykacji dla aplikacji SmartFlash, realizującego wymagania funkcjonalne US-009 (Rejestracja), US-010 (Weryfikacja email), US-011 (Logowanie), US-012 (Resetowanie hasła), US-013 (Usunięcie konta), US-014 (Autoryzacja) oraz US-018 (Bezpieczny dostęp).

System autentykacji oparty jest na Supabase Auth i zintegrowany z architekturą Astro 5 działającą w trybie SSR (Server-Side Rendering).

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Struktura stron i routing

#### 1.1.1. Nowe strony Astro (tryb SSR)

**Strona logowania: `/src/pages/auth/login.astro`**
- **Odpowiedzialność**: Renderowanie strony logowania, obsługa przekierowań dla zalogowanych użytkowników
- **Logika server-side**:
  - Sprawdzenie czy użytkownik jest już zalogowany (poprzez `Astro.locals.supabase.auth.getUser()`)
  - Jeśli użytkownik zalogowany, przekierowanie do `/generate` lub do parametru `returnTo` z query string
  - Obsługa parametru `returnTo` w URL do przekierowania po zalogowaniu
  - Obsługa parametru `message` w URL do wyświetlenia komunikatu (np. po wylogowaniu)
- **Renderowanie**: Zagnieżdżenie komponentu `<LoginForm />` w `<Layout>`
- **Dostępność**: Publiczna (non-auth)

**Strona rejestracji: `/src/pages/auth/register.astro`**
- **Odpowiedzialność**: Renderowanie strony rejestracji, obsługa przekierowań dla zalogowanych użytkowników
- **Logika server-side**:
  - Sprawdzenie czy użytkownik jest już zalogowany
  - Jeśli użytkownik zalogowany, przekierowanie do `/generate`
- **Renderowanie**: Zagnieżdżenie komponentu `<RegisterForm />` w `<Layout>`
- **Dostępność**: Publiczna (non-auth)

**Strona zapomniałem hasła: `/src/pages/auth/forgot-password.astro`**
- **Odpowiedzialność**: Renderowanie formularza żądania resetu hasła
- **Logika server-side**: Minimalna - tylko renderowanie
- **Renderowanie**: Zagnieżdżenie komponentu `<ForgotPasswordForm />` w `<Layout>`
- **Dostępność**: Publiczna (non-auth)

**Strona resetowania hasła: `/src/pages/auth/reset-password.astro`**
- **Odpowiedzialność**: Renderowanie formularza ustawienia nowego hasła
- **Logika server-side**:
  - Walidacja obecności tokenu w query string (parametr `token` lub hash fragment od Supabase)
  - Jeśli brak tokenu, przekierowanie do `/auth/forgot-password` z komunikatem błędu
- **Renderowanie**: Zagnieżdżenie komponentu `<ResetPasswordForm />` w `<Layout>`
- **Dostępność**: Publiczna (non-auth), wymaga tokenu

**Strona weryfikacji email: `/src/pages/auth/verify-email.astro`**
- **Odpowiedzialność**: Obsługa linku weryfikacyjnego z emaila, potwierdzenie weryfikacji
- **Logika server-side**:
  - Odczyt tokenu z URL (Supabase automatycznie obsługuje token)
  - Walidacja statusu weryfikacji
  - Wyświetlenie komunikatu o sukcesie lub błędzie
  - Przekierowanie do `/auth/login` z odpowiednim komunikatem
- **Renderowanie**: Prosta strona informacyjna z komunikatem statusu
- **Dostępność**: Publiczna (non-auth)

**Strona ustawień konta: `/src/pages/account/settings.astro`**
- **Odpowiedzialność**: Zarządzanie kontem użytkownika, w tym usunięcie konta
- **Logika server-side**:
  - Auth guard - wymaga zalogowania
  - Jeśli nie zalogowany, przekierowanie do `/auth/login?returnTo=/account/settings`
  - Pobranie danych użytkownika z `Astro.locals.supabase.auth.getUser()`
- **Renderowanie**: Zagnieżdżenie komponentu `<AccountSettings />` w `<Layout>`
- **Dostępność**: Chroniona (wymaga autentykacji)

#### 1.1.2. Modyfikacja istniejących stron

**Strona główna: `/src/pages/index.astro`**
- **Modyfikacje**:
  - Sprawdzenie statusu autentykacji w logice server-side
  - Warunkowe renderowanie dla użytkowników zalogowanych vs niezalogowanych
  - Dla niezalogowanych: wyświetlenie landing page z przyciskami "Zaloguj się" i "Zarejestruj się"
  - Dla zalogowanych: przekierowanie do `/generate` lub wyświetlenie dashboardu

**Strona generowania fiszek: `/src/pages/generate.astro`**
- **Modyfikacje**:
  - Odkomentowanie i aktywacja auth guard (obecnie zakomentowane linie 6-16)
  - Implementacja pełnej logiki sprawdzania użytkownika:
    ```typescript
    const supabase = Astro.locals.supabase;
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!user || error) {
      const returnTo = encodeURIComponent("/generate");
      return Astro.redirect(`/auth/login?returnTo=${returnTo}`);
    }
    ```
  - Przekazanie `user.id` do komponentu `<GeneratePage />` jako prop

**Przyszłe strony z fiszkami (lista, sesja nauki)**
- **Wymagania**: Wszystkie strony operujące na fiszkach użytkownika wymagają identycznego auth guard
- **Pattern**: Ten sam mechanizm sprawdzania autentykacji i przekierowania co w `generate.astro`

### 1.2. Modyfikacja layoutu aplikacji

**Główny layout: `/src/layouts/Layout.astro`**

Aktualnie layout jest minimalistyczny. Wymaga rozszerzenia o:

**Nowe komponenty w headerze**:
- **Nawigacja dla niezalogowanych użytkowników**:
  - Link "Zaloguj się" → `/auth/login`
  - Link "Zarejestruj się" → `/auth/register`
  - Pozycja: prawy górny róg
  
- **Nawigacja dla zalogowanych użytkowników**:
  - Wyświetlenie emaila użytkownika lub awatara
  - Dropdown menu z opcjami:
    - "Moje fiszki" → `/flashcards`
    - "Generuj fiszki" → `/generate`
    - "Ustawienia konta" → `/account/settings`
    - "Wyloguj się" → akcja wylogowania
  - Pozycja: prawy górny róg

**Logika server-side w Layout.astro**:
```typescript
const supabase = Astro.locals.supabase;
const { data: { user } } = await supabase.auth.getUser();
const isAuthenticated = !!user;
```

**Przekazanie danych do komponentu nawigacyjnego**:
- Props: `isAuthenticated: boolean`, `userEmail?: string`
- Komponent React: `<Navigation client:load isAuthenticated={isAuthenticated} userEmail={user?.email} />`

**Implementacja przycisku wylogowania**:
- Komponent React z obsługą kliknięcia
- Wywołanie endpoint: `POST /api/auth/logout`
- Po sukcesie: przekierowanie do `/auth/login?message=logged_out`

### 1.3. Komponenty React (client-side)

Wszystkie formularze autentykacji są komponentami React z dyrektywą `client:load`, umieszczonymi w katalogu `/src/components/auth/`.

#### 1.3.1. LoginForm Component

**Lokalizacja**: `/src/components/auth/LoginForm.tsx`

**Odpowiedzialność**:
- Zarządzanie stanem formularza (email, hasło)
- Walidacja kliencka (format email, długość hasła)
- Wywołanie API autentykacji
- Obsługa błędów i komunikatów
- Przekierowanie po sukcesie

**Pola formularza**:
- `email`: input typu email, wymagane
- `password`: input typu password, wymagane, min. 10 znaków
- Przycisk "Zaloguj się"
- Link "Zapomniałeś hasła?" → `/auth/forgot-password`
- Link "Nie masz konta? Zarejestruj się" → `/auth/register`

**Walidacja kliencka**:
- Email: walidacja formatu zgodnego z RFC 5322
- Hasło: min. 10 znaków
- Wyświetlenie błędów walidacji pod odpowiednimi polami

**Logika submitowania**:
1. Walidacja danych wejściowych
2. Wywołanie `supabaseClient.auth.signInWithPassword({ email, password })`
3. Obsługa odpowiedzi:
   - **Sukces**: Zapisanie tokenu, przekierowanie do `returnTo` lub `/generate`
   - **Błąd**: Wyświetlenie komunikatu błędu:
     - "Invalid login credentials" → "Nieprawidłowy email lub hasło"
     - "Email not confirmed" → "Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową."
     - Pozostałe błędy → "Wystąpił błąd podczas logowania. Spróbuj ponownie."

**Stany komponentu**:
- `loading`: boolean - czy trwa wysyłanie formularza
- `error`: string | null - komunikat błędu do wyświetlenia
- `formData`: { email: string, password: string }

**Integracja z Supabase**:
- Import: `import { supabaseClient } from '@/db/supabase.client'`
- Metoda: `supabaseClient.auth.signInWithPassword()`
- Zarządzanie sesją: automatyczne przez Supabase (cookies/localStorage)

#### 1.3.2. RegisterForm Component

**Lokalizacja**: `/src/components/auth/RegisterForm.tsx`

**Odpowiedzialność**:
- Zarządzanie stanem formularza rejestracji
- Walidacja kliencka (email, hasło, potwierdzenie hasła)
- Wywołanie API rejestracji
- Obsługa błędów
- Wyświetlenie komunikatu o wysłaniu emaila weryfikacyjnego

**Pola formularza**:
- `email`: input typu email, wymagane
- `password`: input typu password, wymagane, min. 10 znaków
- `confirmPassword`: input typu password, wymagane, musi być identyczne z `password`
- Checkbox akceptacji regulaminu (opcjonalnie)
- Przycisk "Zarejestruj się"
- Link "Masz już konto? Zaloguj się" → `/auth/login`

**Walidacja kliencka** (schemat Zod):
```typescript
const RegisterSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string().min(10, "Hasło musi mieć co najmniej 10 znaków"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});
```

**Logika submitowania**:
1. Walidacja danych wejściowych
2. Wywołanie `supabaseClient.auth.signUp({ email, password })`
3. Obsługa odpowiedzi:
   - **Sukces**: Wyświetlenie komunikatu "Sprawdź swoją skrzynkę pocztową. Wysłaliśmy link weryfikacyjny."
   - **Błąd**: Wyświetlenie komunikatu:
     - "User already registered" → "Ten email jest już zarejestrowany"
     - "Password should be at least 10 characters" → "Hasło musi mieć co najmniej 10 znaków"
     - Pozostałe → "Wystąpił błąd podczas rejestracji. Spróbuj ponownie."

**Stany komponentu**:
- `loading`: boolean
- `error`: string | null
- `success`: boolean - czy rejestracja się powiodła
- `formData`: { email, password, confirmPassword }

**Integracja z Supabase**:
- Metoda: `supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/auth/verify-email' } })`
- Email weryfikacyjny wysyłany automatycznie przez Supabase

#### 1.3.3. ForgotPasswordForm Component

**Lokalizacja**: `/src/components/auth/ForgotPasswordForm.tsx`

**Odpowiedzialność**:
- Formularz żądania linku do resetu hasła
- Walidacja emaila
- Wywołanie API resetu hasła
- Wyświetlenie komunikatu potwierdzającego wysłanie emaila

**Pola formularza**:
- `email`: input typu email, wymagane
- Przycisk "Wyślij link resetujący"
- Link "Pamiętasz hasło? Zaloguj się" → `/auth/login`

**Walidacja kliencka**:
- Email: format emaila

**Logika submitowania**:
1. Walidacja emaila
2. Wywołanie `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/reset-password' })`
3. Obsługa odpowiedzi:
   - **Sukces**: "Jeśli konto o tym emailu istnieje, wysłaliśmy link do resetowania hasła."
   - **Błąd**: "Wystąpił błąd. Spróbuj ponownie."

**Uwaga bezpieczeństwa**: Komunikat sukcesu zawsze taki sam (niezależnie czy email istnieje), aby nie ujawniać informacji o istnieniu konta.

#### 1.3.4. ResetPasswordForm Component

**Lokalizacja**: `/src/components/auth/ResetPasswordForm.tsx`

**Odpowiedzialność**:
- Formularz ustawiania nowego hasła
- Walidacja nowego hasła
- Wywołanie API zmiany hasła
- Przekierowanie do strony logowania po sukcesie

**Pola formularza**:
- `newPassword`: input typu password, wymagane, min. 10 znaków
- `confirmNewPassword`: input typu password, wymagane
- Przycisk "Ustaw nowe hasło"

**Walidacja kliencka**:
- Schema Zod analogiczna jak w RegisterForm
- Hasło min. 10 znaków
- Potwierdzenie hasła musi się zgadzać

**Logika submitowania**:
1. Walidacja danych wejściowych
2. Wywołanie `supabaseClient.auth.updateUser({ password: newPassword })`
3. Obsługa odpowiedzi:
   - **Sukces**: Przekierowanie do `/auth/login?message=password_reset_success`
   - **Błąd**: Wyświetlenie komunikatu "Wystąpił błąd. Spróbuj ponownie lub poproś o nowy link."

**Integracja z Supabase**:
- Token weryfikacyjny z URL jest automatycznie obsługiwany przez Supabase
- Po kliknięciu linku w emailu, Supabase ustawia sesję użytkownika
- `updateUser()` działa tylko jeśli sesja jest ważna (token poprawny)

#### 1.3.5. AccountSettings Component

**Lokalizacja**: `/src/components/account/AccountSettings.tsx`

**Odpowiedzialność**:
- Wyświetlenie informacji o koncie (email, data rejestracji)
- Obsługa usunięcia konta
- Zarządzanie ustawieniami użytkownika

**Sekcje komponentu**:

**Sekcja: Informacje o koncie**
- Wyświetlenie emaila użytkownika (read-only)
- Wyświetlenie daty utworzenia konta

**Sekcja: Zmiana hasła** (opcjonalnie w MVP)
- Link do `/auth/forgot-password` zamiast formularza inline

**Sekcja: Usunięcie konta**
- Przycisk "Usuń konto" (kolor czerwony)
- Po kliknięciu: otwarcie modalu potwierdzenia
- Modal potwierdzenia:
  - Komunikat: "Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna. Wszystkie Twoje fiszki zostaną trwale usunięte."
  - Pole: `password` (wymagane ponowne podanie hasła do potwierdzenia)
  - Przycisk "Anuluj"
  - Przycisk "Usuń konto na stałe"

**Logika usuwania konta**:
1. Walidacja hasła poprzez ponowne logowanie: `supabaseClient.auth.signInWithPassword({ email, password })`
2. Jeśli hasło poprawne: wywołanie endpoint `DELETE /api/account`
3. Endpoint usuwa konto użytkownika (Supabase automatycznie usuwa powiązane dane dzięki RLS i CASCADE)
4. Wylogowanie użytkownika
5. Przekierowanie do `/auth/login?message=account_deleted`

**Integracja z API**:
- Endpoint: `DELETE /api/account`
- Autoryzacja: token JWT w header `Authorization: Bearer <token>`

#### 1.3.6. Navigation Component

**Lokalizacja**: `/src/components/layout/Navigation.tsx`

**Odpowiedzialność**:
- Wyświetlanie nawigacji w zależności od statusu autentykacji
- Obsługa wylogowania

**Props**:
- `isAuthenticated: boolean`
- `userEmail?: string`

**Warunkowe renderowanie**:
- Jeśli `!isAuthenticated`: Linki "Zaloguj się" i "Zarejestruj się"
- Jeśli `isAuthenticated`: Dropdown z email i opcjami

**Logika wylogowania**:
1. Wywołanie `supabaseClient.auth.signOut()`
2. Przekierowanie do `/auth/login?message=logged_out`

### 1.4. Obsługa walidacji i błędów w UI

#### 1.4.1. Walidacja kliencka

Wszystkie formularze używają biblioteki **Zod** do walidacji danych przed wysłaniem do API.

**Schemat walidacji dla logowania**:
```typescript
// /src/lib/schemas/auth.schema.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string().min(10, "Hasło musi mieć co najmniej 10 znaków")
});
```

**Schemat walidacji dla rejestracji**:
```typescript
export const RegisterSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string()
    .min(10, "Hasło musi mieć co najmniej 10 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});
```

**Integracja Zod w komponentach React**:
- Walidacja przy `onSubmit` lub `onChange` (opcjonalnie)
- Wyświetlenie błędów pod odpowiednimi polami
- Użycie `react-hook-form` z `@hookform/resolvers/zod` dla lepszej ergonomii (opcjonalnie)

#### 1.4.2. Komunikaty błędów

**Kategorie błędów**:

1. **Błędy walidacji klienta**:
   - Wyświetlane pod odpowiednim polem formularza
   - Kolor czerwony, małą czcionką
   - Przykład: "Hasło musi mieć co najmniej 10 znaków"

2. **Błędy API** (z Supabase):
   - Wyświetlane jako alert/banner na górze formularza
   - Przykłady:
     - "Invalid login credentials" → "Nieprawidłowy email lub hasło"
     - "Email not confirmed" → "Potwierdź swój email przed zalogowaniem"
     - "User already registered" → "Konto o tym emailu już istnieje"

3. **Błędy sieciowe**:
   - "Wystąpił problem z połączeniem. Sprawdź swoją sieć i spróbuj ponownie."

4. **Błędy nieoczekiwane**:
   - "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę."

**Implementacja komponentu komunikatów**:
```typescript
// /src/components/ui/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export function ErrorMessage({ message, type = 'error' }: ErrorMessageProps) {
  // Stylowanie według typu z Tailwind
  // Użycie Shadcn/ui Alert component
}
```

#### 1.4.3. Komunikaty sukcesu

**Użycie Toasts (Shadcn/ui Sonner)**:
- Po udanej rejestracji: "Sprawdź swoją skrzynkę pocztową"
- Po udanym resecie hasła: "Hasło zostało zmienione"
- Po udanym wylogowaniu: "Wylogowano pomyślnie"

**Komunikaty w URL (query params)**:
- Pattern: `/auth/login?message=logged_out`
- Odczyt w komponencie i wyświetlenie odpowiedniego toasta
- Komunikaty obsługiwane:
  - `logged_out`: "Zostałeś wylogowany"
  - `password_reset_success`: "Hasło zostało zmienione. Możesz się teraz zalogować."
  - `account_deleted`: "Twoje konto zostało usunięte"
  - `email_verified`: "Email został zweryfikowany. Możesz się teraz zalogować."

### 1.5. Obsługa najważniejszych scenariuszy użytkownika

#### Scenariusz 1: Rejestracja nowego użytkownika

**Przepływ**:
1. Użytkownik wchodzi na `/auth/register`
2. Wypełnia formularz (email, hasło, potwierdzenie hasła)
3. Kliknięcie "Zarejestruj się" → walidacja kliencka
4. Jeśli walidacja OK → wywołanie `supabaseClient.auth.signUp()`
5. Supabase wysyła email weryfikacyjny
6. Użytkownik widzi komunikat: "Sprawdź swoją skrzynkę pocztową i kliknij link weryfikacyjny"
7. Użytkownik klika link w emailu → przekierowanie do `/auth/verify-email?token=...`
8. Supabase weryfikuje token i potwierdza konto
9. Użytkownik jest przekierowywany do `/auth/login?message=email_verified`
10. Toast: "Email zweryfikowany. Możesz się teraz zalogować."

**Przypadki brzegowe**:
- Email już istnieje → komunikat "Konto o tym emailu już istnieje"
- Błąd walidacji → wyświetlenie błędów pod polami
- Użytkownik już zalogowany → przekierowanie do `/generate`

#### Scenariusz 2: Logowanie użytkownika

**Przepływ**:
1. Użytkownik wchodzi na `/auth/login`
2. Wypełnia email i hasło
3. Kliknięcie "Zaloguj się" → walidacja kliencka
4. Wywołanie `supabaseClient.auth.signInWithPassword()`
5. Supabase zwraca token JWT i dane użytkownika
6. Token jest zapisywany automatycznie (cookies/localStorage)
7. Użytkownik jest przekierowywany do `returnTo` lub `/generate`

**Przypadki brzegowe**:
- Nieprawidłowe dane → "Nieprawidłowy email lub hasło"
- Email nie zweryfikowany → "Potwierdź swój email przed zalogowaniem"
- Użytkownik już zalogowany → przekierowanie do `/generate`

#### Scenariusz 3: Zapomniałem hasła

**Przepływ**:
1. Użytkownik klika "Zapomniałeś hasła?" na `/auth/login`
2. Przekierowanie do `/auth/forgot-password`
3. Użytkownik wpisuje email i klika "Wyślij link"
4. Wywołanie `supabaseClient.auth.resetPasswordForEmail()`
5. Komunikat: "Jeśli konto o tym emailu istnieje, wysłaliśmy link do resetowania hasła"
6. Użytkownik otrzymuje email z linkiem
7. Klika link → przekierowanie do `/auth/reset-password?token=...`
8. Użytkownik wpisuje nowe hasło (min. 10 znaków) i potwierdza
9. Wywołanie `supabaseClient.auth.updateUser({ password })`
10. Przekierowanie do `/auth/login?message=password_reset_success`
11. Toast: "Hasło zostało zmienione. Możesz się teraz zalogować."

**Przypadki brzegowe**:
- Nieprawidłowy/wygasły token → komunikat "Link wygasł. Poproś o nowy link."
- Błąd walidacji nowego hasła → wyświetlenie błędów

#### Scenariusz 4: Wylogowanie

**Przepływ**:
1. Użytkownik klika "Wyloguj się" w nawigacji (dropdown)
2. Wywołanie `supabaseClient.auth.signOut()`
3. Supabase usuwa sesję i token
4. Przekierowanie do `/auth/login?message=logged_out`
5. Toast: "Zostałeś wylogowany"

#### Scenariusz 5: Usunięcie konta

**Przepływ**:
1. Zalogowany użytkownik wchodzi na `/account/settings`
2. Klika "Usuń konto"
3. Otwiera się modal z ostrzeżeniem i polem hasła
4. Użytkownik wpisuje hasło i klika "Usuń konto na stałe"
5. Walidacja hasła przez ponowne logowanie
6. Jeśli hasło poprawne → wywołanie `DELETE /api/account`
7. Endpoint usuwa użytkownika (Supabase automatycznie usuwa powiązane fiszki przez CASCADE)
8. Wylogowanie użytkownika
9. Przekierowanie do `/auth/login?message=account_deleted`
10. Toast: "Twoje konto zostało usunięte"

**Przypadki brzegowe**:
- Nieprawidłowe hasło → "Nieprawidłowe hasło"
- Błąd sieciowy → "Wystąpił błąd. Spróbuj ponownie."

#### Scenariusz 6: Dostęp do chronionej strony bez logowania

**Przepływ**:
1. Niezalogowany użytkownik próbuje wejść na `/generate`
2. Auth guard w `generate.astro` sprawdza sesję
3. Brak sesji → przekierowanie do `/auth/login?returnTo=/generate`
4. Po zalogowaniu użytkownik jest przekierowany z powrotem do `/generate`

## 2. LOGIKA BACKENDOWA

### 2.1. Architektura backendowa - Supabase jako Backend-as-a-Service

System autentykacji SmartFlash opiera się na **Supabase Auth**, co oznacza, że większość logiki backendowej (zarządzanie użytkownikami, sesje, tokeny JWT, wysyłka emaili) jest obsługiwana przez Supabase.

**Własna logika backendowa ograniczona do**:
- Middleware do obsługi sesji w Astro
- Auth service (wrapper na Supabase Auth)
- Endpoint do usunięcia konta
- Walidacja Zod dla danych wejściowych (duplikacja walidacji klienckiej)

### 2.2. Struktura endpointów API

#### 2.2.1. Endpointy obsługiwane przez Supabase (brak własnej implementacji)

Następujące operacje są obsługiwane bezpośrednio przez Supabase Auth SDK po stronie klienta:

- **POST** `supabase.auth.signUp()` - Rejestracja użytkownika
- **POST** `supabase.auth.signInWithPassword()` - Logowanie
- **POST** `supabase.auth.signOut()` - Wylogowanie
- **POST** `supabase.auth.resetPasswordForEmail()` - Żądanie resetu hasła
- **POST** `supabase.auth.updateUser()` - Zmiana hasła/danych użytkownika
- **GET** `supabase.auth.getUser()` - Pobranie aktualnie zalogowanego użytkownika

**Nie tworzymy własnych endpointów dla tych operacji.**

#### 2.2.2. Własne endpointy API

**Endpoint usunięcia konta: `DELETE /api/account`**

**Lokalizacja**: `/src/pages/api/account/index.ts`

**Odpowiedzialność**: Usunięcie konta użytkownika i wszystkich powiązanych danych

**Autoryzacja**: Wymagany token JWT w header `Authorization: Bearer <token>`

**Logika**:
1. Walidacja tokenu JWT przez middleware
2. Pobranie `user.id` z `locals.supabase.auth.getUser()`
3. Usunięcie użytkownika przez Supabase Admin API:
   ```typescript
   const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
   ```
4. Dzięki CASCADE w bazie danych, wszystkie fiszki użytkownika są automatycznie usuwane
5. Zwrócenie odpowiedzi:
   - **200 OK**: `{ message: "Account deleted successfully" }`
   - **401 Unauthorized**: `{ error: { code: "unauthorized", message: "Not authenticated" } }`
   - **500 Internal Error**: `{ error: { code: "internal_error", message: "Failed to delete account" } }`

**Implementacja**:
```typescript
// /src/pages/api/account/index.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Admin client with service_role key (env variable)
const supabaseAdmin = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const DELETE: APIRoute = async ({ locals }) => {
  try {
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: { code: 'unauthorized', message: 'Not authenticated' }
      }), { status: 401 });
    }

    // Delete user through admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return new Response(JSON.stringify({
        error: { code: 'internal_error', message: 'Failed to delete account' }
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      message: 'Account deleted successfully'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error during account deletion:', error);
    return new Response(JSON.stringify({
      error: { code: 'internal_error', message: 'An unexpected error occurred' }
    }), { status: 500 });
  }
};
```

**Wymagane zmienne środowiskowe**:
- `SUPABASE_SERVICE_ROLE_KEY` - klucz z uprawnieniami administratora

### 2.3. Serwis autentykacji

**Lokalizacja**: `/src/lib/services/auth.service.ts`

**Cel**: Centralizacja logiki autentykacji, zapewnienie typowej abstrakcji nad Supabase Auth

**Odpowiedzialność**:
- Wrapper funkcji Supabase Auth
- Obsługa błędów i mapowanie komunikatów
- Typu bezpieczeństwa (TypeScript)

**Struktura serwisu**:

```typescript
// /src/lib/services/auth.service.ts
import type { SupabaseClient } from '@/db/supabase.client';
import type { AuthLoginCommand, AuthSignUpCommand } from '@/types';

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Rejestracja nowego użytkownika
   * @param command - dane rejestracyjne (email, password)
   * @returns Promise z danymi użytkownika lub błędem
   */
  async signUp(command: AuthSignUpCommand) {
    const { email, password } = command;
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${import.meta.env.PUBLIC_APP_URL}/auth/verify-email`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Logowanie użytkownika
   * @param command - dane logowania (email, password)
   * @returns Promise z sesją użytkownika lub błędem
   */
  async signIn(command: AuthLoginCommand) {
    const { email, password } = command;
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Wylogowanie użytkownika
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Żądanie resetu hasła
   * @param email - adres email użytkownika
   */
  async resetPasswordRequest(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.PUBLIC_APP_URL}/auth/reset-password`
    });
    
    if (error) throw error;
  }

  /**
   * Ustawienie nowego hasła
   * @param newPassword - nowe hasło
   */
  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  }

  /**
   * Pobranie aktualnie zalogowanego użytkownika
   * @returns Promise z danymi użytkownika lub null
   */
  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
}
```

**Użycie serwisu**:
- W komponentach React: `const authService = new AuthService(supabaseClient)`
- W endpointach API: `const authService = new AuthService(locals.supabase)`

### 2.4. Walidacja danych wejściowych (Zod schemas)

**Lokalizacja**: `/src/lib/schemas/auth.schema.ts`

Wszystkie schematy walidacyjne dla autentykacji w jednym miejscu.

```typescript
// /src/lib/schemas/auth.schema.ts
import { z } from 'zod';

/**
 * Schema walidacji dla logowania
 */
export const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string().min(10, "Hasło musi mieć co najmniej 10 znaków")
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Schema walidacji dla rejestracji
 */
export const RegisterSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila"),
  password: z.string()
    .min(10, "Hasło musi mieć co najmniej 10 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Schema walidacji dla żądania resetu hasła
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format emaila")
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Schema walidacji dla resetu hasła
 */
export const ResetPasswordSchema = z.object({
  password: z.string()
    .min(10, "Hasło musi mieć co najmniej 10 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
```

**Użycie schematów**:
- W komponentach React: walidacja przed submitowaniem formularza
- W endpointach API: walidacja danych przychodzących (jeśli byłyby własne endpointy auth)

### 2.5. Middleware - obsługa sesji i autoryzacji

**Lokalizacja**: `/src/middleware/index.ts` (rozszerzenie istniejącego)

Aktualnie middleware tworzy klienta Supabase per request. Wymaga rozszerzenia o:

**Dodatkowe funkcje middleware**:
1. Automatyczne odświeżanie sesji (jeśli token wygasł)
2. Ustawienie `locals.user` dla wygody w endpoint'ach i stronach Astro

**Rozszerzona implementacja**:

```typescript
// /src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../db/database.types";

export const onRequest = defineMiddleware(async ({ locals, request, cookies }, next) => {
  // Create a Supabase client for this specific request
  locals.supabase = createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        get: (key: string) => {
          // Try to get from cookies first (for SSR pages)
          const cookie = cookies.get(key);
          if (cookie) return cookie.value;
          
          // Fallback to Authorization header (for API routes)
          const authHeader = request.headers.get("authorization");
          if (authHeader?.startsWith("Bearer ")) {
            return authHeader.substring(7);
          }
          return null;
        },
        set: (key: string, value: string, options: any) => {
          cookies.set(key, value, options);
        },
        remove: (key: string, options: any) => {
          cookies.delete(key, options);
        },
      },
    }
  );

  // Try to get the user from the session
  try {
    const { data: { user }, error } = await locals.supabase.auth.getUser();
    locals.user = error ? null : user;
  } catch {
    locals.user = null;
  }

  return next();
});
```

**Typy dla `locals`**:

```typescript
// /src/env.d.ts (rozszerzenie)
/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
    user: User | null;
  }
}
```

**Korzyści**:
- Każda strona Astro i endpoint API ma dostęp do `locals.user` bez dodatkowego wywoływania `getUser()`
- Automatyczne zarządzanie cookies i sesjami

### 2.6. Obsługa wyjątków i błędów w API

#### 2.6.1. Mapowanie błędów Supabase

Supabase Auth zwraca błędy w formacie:
```typescript
{
  error: {
    message: string,
    status: number
  }
}
```

**Najczęstsze błędy Supabase Auth i ich mapowanie**:

| Błąd Supabase | Kod HTTP | Komunikat dla użytkownika (PL) |
|---|---|---|
| `Invalid login credentials` | 400 | "Nieprawidłowy email lub hasło" |
| `Email not confirmed` | 400 | "Potwierdź swój email przed zalogowaniem" |
| `User already registered` | 400 | "Konto o tym emailu już istnieje" |
| `Password should be at least X characters` | 400 | "Hasło musi mieć co najmniej 10 znaków" |
| `Invalid or expired reset token` | 400 | "Link resetujący hasło wygasł. Poproś o nowy link." |
| Network error | 500 | "Problem z połączeniem. Spróbuj ponownie." |
| Unexpected error | 500 | "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę." |

**Helper do mapowania błędów**:

```typescript
// /src/lib/helpers/auth-error.ts

export function mapAuthError(error: any): string {
  if (!error) return "Wystąpił nieoczekiwany błąd";
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid login credentials')) {
    return "Nieprawidłowy email lub hasło";
  }
  
  if (message.includes('email not confirmed')) {
    return "Potwierdź swój email przed zalogowaniem. Sprawdź swoją skrzynkę pocztową.";
  }
  
  if (message.includes('user already registered')) {
    return "Konto o tym emailu już istnieje. Spróbuj się zalogować.";
  }
  
  if (message.includes('password')) {
    return "Hasło musi mieć co najmniej 10 znaków i zawierać wielką literę, małą literę oraz cyfrę.";
  }
  
  if (message.includes('invalid') && message.includes('token')) {
    return "Link wygasł lub jest nieprawidłowy. Poproś o nowy link.";
  }
  
  if (error.status === 500 || message.includes('network')) {
    return "Problem z połączeniem. Sprawdź swoją sieć i spróbuj ponownie.";
  }
  
  return "Wystąpił błąd. Spróbuj ponownie za chwilę.";
}
```

**Użycie w komponentach**:
```typescript
try {
  await authService.signIn({ email, password });
} catch (error) {
  setError(mapAuthError(error));
}
```

#### 2.6.2. Standardowy format błędów API

Dla spójności z resztą aplikacji, błędy zwracane przez własne endpointy API (np. `DELETE /api/account`) używają formatu z `types.ts`:

```typescript
{
  error: {
    code: ApiErrorCode,
    message: string,
    details?: Record<string, unknown>
  }
}
```

### 2.7. Aktualizacja sposobu renderowania stron (SSR)

**Astro.config.mjs** jest już skonfigurowane z `output: "server"`, co oznacza że wszystkie strony są renderowane server-side domyślnie.

**Implikacje dla autentykacji**:

1. **Auth guard wykonywany server-side**:
   - Sprawdzanie `locals.user` w każdej chronionej stronie
   - Przekierowania 302 jeśli brak autoryzacji
   - Brak "flashowania" niezalogowanej treści (lepsze UX)

2. **Dostęp do danych użytkownika podczas renderowania**:
   ```typescript
   ---
   const user = Astro.locals.user;
   const isAuthenticated = !!user;
   ---
   <Layout>
     {isAuthenticated ? <Dashboard user={user} /> : <LoginPrompt />}
   </Layout>
   ```

3. **Przekazywanie danych użytkownika do komponentów React**:
   ```typescript
   <GeneratePage client:load user={user} />
   ```

**Optymalizacja**: Strony publiczne (landing, login, register) mogą pozostać dynamiczne SSR lub zostać zoptymalizowane jako partial hydration z cache.

## 3. SYSTEM AUTENTYKACJI

### 3.1. Wykorzystanie Supabase Auth

**Supabase Auth** to kompleksowe rozwiązanie do zarządzania autentykacją, oferujące:

#### 3.1.1. Kluczowe funkcje Supabase Auth użyte w projekcie

1. **Rejestracja użytkowników** (`signUp`):
   - Tworzenie konta z emailem i hasłem
   - Automatyczne wysyłanie emaili weryfikacyjnych
   - Configurable password policies (min length, strength)

2. **Weryfikacja emaila**:
   - Wysyłka emaila z tokenem weryfikacyjnym
   - Automatyczne potwierdzenie po kliknięciu linku
   - Blokada logowania dla niezweryfikowanych użytkowników (opcjonalne)

3. **Logowanie** (`signInWithPassword`):
   - Weryfikacja credentials
   - Generowanie JWT tokenu
   - Zarządzanie sesjami (cookies/localStorage)

4. **Sesje i tokeny JWT**:
   - Access token (JWT) z czasem wygaśnięcia (default 1h)
   - Refresh token do odświeżania sesji
   - Automatyczne odświeżanie przez SDK

5. **Resetowanie hasła**:
   - `resetPasswordForEmail()` - wysyłka linku resetu
   - `updateUser({ password })` - ustawienie nowego hasła

6. **Zarządzanie użytkownikami**:
   - `getUser()` - pobranie danych zalogowanego użytkownika
   - `updateUser()` - aktualizacja danych użytkownika
   - Admin API: `deleteUser()` - usunięcie użytkownika

#### 3.1.2. Konfiguracja Supabase Auth w projekcie

**Lokalizacja ustawień**: Supabase Dashboard → Authentication → Settings

**Wymagane ustawienia**:

1. **Email Templates** (customizacja emaili):
   - **Confirm signup**: Email weryfikacyjny po rejestracji
   - **Reset password**: Email z linkiem do resetu hasła
   - **Magic Link** (opcjonalnie wyłączone)

2. **URL Configuration**:
   - **Site URL**: `https://smartflash.app` (produkcja) lub `http://localhost:3000` (development)
   - **Redirect URLs**: Lista dozwolonych URL do przekierowań:
     - `http://localhost:3000/auth/verify-email`
     - `http://localhost:3000/auth/reset-password`
     - `https://smartflash.app/auth/verify-email`
     - `https://smartflash.app/auth/reset-password`

3. **Password Requirements**:
   - Minimum length: 10 characters
   - Optionally: require uppercase, lowercase, numbers, special chars

4. **Email Confirmation**:
   - **Enable email confirmations**: ON (użytkownicy muszą potwierdzić email przed pełnym dostępem)
   - **Double opt-in**: ON (bezpieczniejsze)

5. **Session Settings**:
   - **JWT expiry**: 3600 seconds (1 hour)
   - **Refresh token rotation**: ON (bezpieczniejsze)

#### 3.1.3. Zmienne środowiskowe

**Wymagane zmienne w `.env`**:

```bash
# Public (dostępne po stronie klienta)
PUBLIC_APP_URL=http://localhost:3000

# Supabase (dostępne po stronie serwera i klienta)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)

# Supabase Admin (tylko server-side, dla operacji admin)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role key)
```

**Bezpieczeństwo**:
- `SUPABASE_KEY` (anon key) może być użyty po stronie klienta (bezpieczny, ma ograniczone uprawnienia)
- `SUPABASE_SERVICE_ROLE_KEY` **NIGDY** nie może być wystawiony po stronie klienta (pełne uprawnienia admin)

### 3.2. Mechanizm obsługi JWT tokenów

#### 3.2.1. Cykl życia tokenu JWT

1. **Generowanie tokenu** (podczas logowania/rejestracji):
   - Supabase generuje access token (JWT) i refresh token
   - Access token zawiera: `user_id`, `email`, `role`, `exp` (czas wygaśnięcia)
   - Tokeny są przechowywane automatycznie przez SDK

2. **Przechowywanie tokenów**:
   - **W aplikacjach web**: Cookies (HttpOnly dla bezpieczeństwa) lub localStorage
   - **Supabase SSR**: Cookies zarządzane przez `@supabase/ssr`

3. **Wysyłanie tokenu w requestach**:
   - **API routes**: Header `Authorization: Bearer <access_token>`
   - **SSR pages**: Cookies automatycznie wysyłane z requestem

4. **Weryfikacja tokenu**:
   - Middleware sprawdza token przy każdym requeście
   - Supabase SDK automatycznie weryfikuje sygnaturę JWT
   - Sprawdzenie `exp` (czy token nie wygasł)

5. **Odświeżanie tokenu**:
   - Gdy access token wygasa, SDK automatycznie używa refresh token
   - Nowy access token jest generowany bez konieczności ponownego logowania
   - Refresh token ma dłuższy czas życia (default 30 dni)

6. **Wygaśnięcie sesji**:
   - Gdy refresh token wygasa, użytkownik musi się zalogować ponownie
   - Przekierowanie do `/auth/login?returnTo=<current_path>`

#### 3.2.2. Struktura JWT tokenu

**Przykładowy payload access token**:
```json
{
  "aud": "authenticated",
  "exp": 1704643200,
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {},
  "role": "authenticated",
  "aal": "aal1",
  "amr": [
    {
      "method": "password",
      "timestamp": 1704639600
    }
  ],
  "session_id": "xyz123..."
}
```

**Kluczowe pola**:
- `sub`: ID użytkownika (UUID)
- `email`: Email użytkownika
- `exp`: Timestamp wygaśnięcia tokenu
- `role`: Rola użytkownika (`authenticated` dla zalogowanych)

#### 3.2.3. Integracja JWT w middleware Astro

Middleware automatycznie:
1. Odczytuje token z cookies lub Authorization header
2. Tworzy klienta Supabase z tym tokenem
3. Weryfikuje token przez wywołanie `getUser()`
4. Ustawia `locals.user` dla dostępu w stronach i API

**Nie wymagamy ręcznej weryfikacji JWT** - Supabase SDK to robi automatycznie.

### 3.3. Session management

#### 3.3.1. Zarządzanie sesjami po stronie klienta

**Biblioteka**: `@supabase/supabase-js` (w `src/db/supabase.client.ts`)

**Automatyczne zarządzanie sesjami**:
- SDK Supabase automatycznie zapisuje tokeny w localStorage/cookies
- Automatyczne odświeżanie access token gdy wygasa
- Event listener dla zmiany stanu autoryzacji:

```typescript
// Opcjonalnie: monitorowanie zmian stanu auth
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Użytkownik się zalogował
    console.log('User signed in:', session?.user);
  }
  
  if (event === 'SIGNED_OUT') {
    // Użytkownik się wylogował
    console.log('User signed out');
    window.location.href = '/auth/login';
  }
  
  if (event === 'TOKEN_REFRESHED') {
    // Token został odświeżony
    console.log('Token refreshed');
  }
});
```

**Użycie w komponentach React**:
- Hook `useEffect` do sprawdzania stanu sesji przy montowaniu komponentu
- Sprawdzanie `supabaseClient.auth.getSession()` zamiast `getUser()` dla lepszej wydajności

#### 3.3.2. Zarządzanie sesjami po stronie serwera (SSR)

**Biblioteka**: `@supabase/ssr` (w `src/middleware/index.ts`)

**Kluczowe różnice SSR vs client**:
- Cookies są preferowane nad localStorage (bardziej bezpieczne, HttpOnly)
- Session jest sprawdzana przy każdym requeście server-side
- Brak automatycznego odświeżania w runtime (tylko przy nowym requeście)

**Flow sesji SSR**:
1. Użytkownik loguje się → Supabase ustawia cookies
2. Następny request → Middleware odczytuje cookies
3. Middleware tworzy klienta Supabase z cookies
4. Sprawdzenie sesji przez `getUser()`
5. Jeśli token wygasł → SDK automatycznie odświeża (jeśli refresh token ważny)
6. Ustawienie `locals.user` dla strony/API

**Obsługa wygaśnięcia sesji**:
```typescript
// W każdej chronionej stronie Astro
const user = Astro.locals.user;

if (!user) {
  const returnTo = encodeURIComponent(Astro.url.pathname);
  return Astro.redirect(`/auth/login?returnTo=${returnTo}`);
}
```

### 3.4. Flow weryfikacji emaila

#### 3.4.1. Proces weryfikacji krok po kroku

**Krok 1: Rejestracja**
- Użytkownik wypełnia formularz rejestracji
- Frontend wywołuje `supabaseClient.auth.signUp({ email, password })`
- Supabase:
  - Tworzy użytkownika w bazie danych
  - Ustawia `email_confirmed_at` na `NULL`
  - Generuje token weryfikacyjny
  - Wysyła email weryfikacyjny

**Krok 2: Email weryfikacyjny**

**Przykładowa treść emaila** (konfiguracja w Supabase Dashboard):
```
Temat: Potwierdź swój adres email - SmartFlash

Cześć!

Dziękujemy za rejestrację w SmartFlash. Kliknij poniższy link, aby potwierdzić swój adres email:

{{ .ConfirmationURL }}

Link jest ważny przez 24 godziny.

Jeśli nie zakładałeś konta w SmartFlash, zignoruj tę wiadomość.

Pozdrawiamy,
Zespół SmartFlash
```

**Format linku weryfikacyjnego**:
```
https://smartflash.app/auth/verify-email?token=xxxxx&type=signup
```

**Krok 3: Kliknięcie linku**
- Użytkownik klika link w emailu
- Przekierowanie do `/auth/verify-email?token=xxxxx&type=signup`
- Supabase automatycznie przetwarza token (przez redirect lub kod w stronie)

**Krok 4: Potwierdzenie weryfikacji**

**Implementacja `/src/pages/auth/verify-email.astro`**:
```typescript
---
import Layout from '@/layouts/Layout.astro';

// Supabase automatically handles the token from URL
// If user clicks the link, Supabase sets email_confirmed_at
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

let status: 'success' | 'error' | 'already_verified' = 'success';
let message = 'Twój email został zweryfikowany! Możesz się teraz zalogować.';

if (error) {
  status = 'error';
  message = 'Link weryfikacyjny jest nieprawidłowy lub wygasł.';
} else if (user?.email_confirmed_at) {
  // Email already verified
  status = 'already_verified';
  message = 'Twój email został już wcześniej zweryfikowany.';
}

// Auto-redirect to login after 3 seconds
const redirectUrl = status === 'success' 
  ? '/auth/login?message=email_verified' 
  : '/auth/login';
---

<Layout title="Weryfikacja emaila">
  <div class="verify-container">
    {status === 'success' && (
      <div class="success-message">
        <h1>Email zweryfikowany!</h1>
        <p>{message}</p>
        <p>Przekierowujemy Cię do strony logowania...</p>
      </div>
    )}
    
    {status === 'already_verified' && (
      <div class="info-message">
        <h1>Email już zweryfikowany</h1>
        <p>{message}</p>
        <a href="/auth/login">Przejdź do logowania</a>
      </div>
    )}
    
    {status === 'error' && (
      <div class="error-message">
        <h1>Błąd weryfikacji</h1>
        <p>{message}</p>
        <a href="/auth/register">Zarejestruj się ponownie</a>
      </div>
    )}
  </div>
  
  <script>
    // Auto-redirect after 3 seconds on success
    if (window.location.search.includes('message=email_verified')) {
      setTimeout(() => {
        window.location.href = '/auth/login?message=email_verified';
      }, 3000);
    }
  </script>
</Layout>
```

#### 3.4.2. Obsługa przypadków brzegowych

**Przypadek 1: Link wygasł (>24h)**
- Supabase zwraca błąd
- Wyświetlenie komunikatu: "Link wygasł. Zarejestruj się ponownie lub skontaktuj się z pomocą techniczną."

**Przypadek 2: Email już zweryfikowany**
- Sprawdzenie `user.email_confirmed_at !== null`
- Wyświetlenie: "Twój email został już zweryfikowany. Możesz się zalogować."

**Przypadek 3: Użytkownik próbuje się zalogować przed weryfikacją**
- Supabase może zablokować logowanie (zależnie od konfiguracji)
- Jeśli włączono wymóg weryfikacji: błąd "Email not confirmed"
- Wyświetlenie: "Potwierdź swój email przed zalogowaniem. Sprawdź swoją skrzynkę pocztową."

**Przypadek 4: Email nie dotarł**
- Opcja: "Nie otrzymałeś emaila? Wyślij ponownie"
- Endpoint `POST /api/auth/resend-verification` (opcjonalnie):
  ```typescript
  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email: userEmail
  });
  ```

### 3.5. Flow resetowania hasła

#### 3.5.1. Proces resetowania krok po kroku

**Krok 1: Żądanie resetu hasła**
- Użytkownik klika "Zapomniałeś hasła?" na stronie logowania
- Przekierowanie do `/auth/forgot-password`
- Użytkownik wpisuje email i klika "Wyślij link"
- Frontend wywołuje:
  ```typescript
  await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
  ```
- Supabase wysyła email z linkiem resetującym

**Krok 2: Email resetujący**

**Przykładowa treść emaila**:
```
Temat: Zresetuj hasło - SmartFlash

Cześć!

Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w SmartFlash.

Kliknij poniższy link, aby ustawić nowe hasło:

{{ .ConfirmationURL }}

Link jest ważny przez 1 godzinę.

Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

Pozdrawiamy,
Zespół SmartFlash
```

**Format linku resetującego**:
```
https://smartflash.app/auth/reset-password?token=xxxxx&type=recovery
```

**Krok 3: Kliknięcie linku**
- Użytkownik klika link w emailu
- Przekierowanie do `/auth/reset-password?token=xxxxx&type=recovery`
- Supabase automatycznie ustawia sesję użytkownika (na podstawie tokenu)

**Krok 4: Ustawienie nowego hasła**

**Implementacja `/src/pages/auth/reset-password.astro`**:
```typescript
---
import Layout from '@/layouts/Layout.astro';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

// Check if user has a valid recovery session
const supabase = Astro.locals.supabase;
const { data: { user }, error } = await supabase.auth.getUser();

// If no valid session (token invalid/expired), redirect to forgot-password
if (error || !user) {
  return Astro.redirect('/auth/forgot-password?error=invalid_token');
}
---

<Layout title="Ustaw nowe hasło">
  <ResetPasswordForm client:load />
</Layout>
```

**Komponent ResetPasswordForm**:
- Użytkownik wpisuje nowe hasło (min. 10 znaków) i potwierdza
- Walidacja kliencka (Zod schema)
- Submit → wywołanie:
  ```typescript
  await supabaseClient.auth.updateUser({ password: newPassword });
  ```
- Sukces → przekierowanie do `/auth/login?message=password_reset_success`

**Krok 5: Potwierdzenie i logowanie**
- Toast: "Hasło zostało zmienione. Możesz się teraz zalogować."
- Użytkownik loguje się nowym hasłem

#### 3.5.2. Bezpieczeństwo resetu hasła

**Ochrona przed atakami**:
1. **Rate limiting**: Supabase automatycznie limituje liczbę żądań resetu z jednego IP (zapobieganie spamowi)
2. **Token expiry**: Link resetujący ważny tylko 1 godzinę
3. **One-time use**: Token może być użyty tylko raz
4. **Brak ujawniania informacji**: Komunikat sukcesu zawsze taki sam (niezależnie czy email istnieje)

**Dobre praktyki**:
- Nie ujawniamy czy konto o danym emailu istnieje (komunikat: "Jeśli konto istnieje, wysłaliśmy link")
- Wymuszamy silne hasła (min. 10 znaków, wielkie/małe litery, cyfry)
- Logowanie próby resetu hasła (audyt bezpieczeństwa)

### 3.6. Row Level Security (RLS) w Supabase

**Row Level Security** to mechanizm zabezpieczający dane w PostgreSQL, który automatycznie filtruje wiersze na podstawie kontekstu użytkownika (JWT token).

#### 3.6.1. Polityki RLS dla tabeli `flashcards`

**Cel**: Każdy użytkownik widzi i modyfikuje tylko swoje fiszki.

**Polityki do zaimplementowania w Supabase**:

**Polityka 1: SELECT (odczyt)**
```sql
CREATE POLICY "Users can view own flashcards"
ON flashcards
FOR SELECT
USING (auth.uid() = user_id);
```

**Polityka 2: INSERT (tworzenie)**
```sql
CREATE POLICY "Users can create own flashcards"
ON flashcards
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Polityka 3: UPDATE (edycja)**
```sql
CREATE POLICY "Users can update own flashcards"
ON flashcards
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Polityka 4: DELETE (usuwanie)**
```sql
CREATE POLICY "Users can delete own flashcards"
ON flashcards
FOR DELETE
USING (auth.uid() = user_id);
```

**Włączenie RLS na tabeli**:
```sql
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
```

#### 3.6.2. Polityki RLS dla tabeli `generations`

**Analogiczne polityki dla tabeli `generations`**:

```sql
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
ON generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own generations"
ON generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
ON generations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
ON generations FOR DELETE
USING (auth.uid() = user_id);
```

#### 3.6.3. Polityki RLS dla tabeli `generation_error_logs`

```sql
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own error logs"
ON generation_error_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own error logs"
ON generation_error_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### 3.6.4. Jak RLS współpracuje z aplikacją

**Automatyczna filtracja**:
- Gdy użytkownik wykonuje query `SELECT * FROM flashcards`, PostgreSQL automatycznie dodaje warunek `WHERE user_id = auth.uid()`
- RLS automatycznie filtruje wyniki po `auth.uid()`, co zapewnia silną warstwę bezpieczeństwa ("defense in depth").
- Jednakże PRD (US-014) wymaga, aby próba dostępu do czyichś zasobów przez API zwracała kod 403 (Forbidden). Domyślne zachowanie RLS to zwrócenie pustego wyniku / brak rekordu (co mapuje się na 404 w API), a nie 403.
- Aby zgodnie z PRD zwracać 403 w przypadkach, gdy zasób istnieje, lecz należy do innego użytkownika, rekomendujemy następujący wzorzec dla endpointów przyjmujących ID zasobu:
  1. Wykonaj zapytanie z filtrem po `id` i `user_id = auth.uid()` (użytkownik powinien widzieć własny rekord).
  2. Jeśli wynik jest null, wykonaj zapytanie administracyjne (server-side, z użyciem `supabaseAdmin` lub innego serwisu z uprawnieniami admin) aby sprawdzić, czy rekord w ogóle istnieje.
     - Jeśli rekord istnieje i `record.user_id !== currentUser.id` → zwróć 403 Forbidden (spełnia kryterium PRD).
     - Jeśli rekord nie istnieje → zwróć 404 Not Found.
  3. Alternatywa: zamiast zapytania admin możesz przyjąć politykę zwracania 404 dla wszystkich nieistniejących/nieautoryzowanych zasobów — to prostsze, lecz nie spełnia kryterium PRD dotyczącego 403.

Przykład wzorca (pseudo-code, server-side):
```typescript
// 1. Próba pobrania rekordu należącego do bieżącego użytkownika
const { data: record } = await locals.supabase
  .from('flashcards')
  .select('*')
  .eq('id', flashcardId)
  .eq('user_id', currentUser.id)
  .single();

if (record) {
  return record; // 200 OK
}

// 2. Sprawdzenie istnienia rekordu bez RLS (admin client)
const { data: existing } = await supabaseAdmin
  .from('flashcards')
  .select('user_id')
  .eq('id', flashcardId)
  .single();

if (existing && existing.user_id !== currentUser.id) {
  return new Response('Forbidden', { status: 403 });
}

return new Response('Not found', { status: 404 });
```

**Funkcja `auth.uid()`**:
- Supabase automatycznie ekstraktuje `user_id` z JWT tokenu
- Funkcja `auth.uid()` zwraca UUID zalogowanego użytkownika
- Jeśli użytkownik niezalogowany, `auth.uid()` zwraca `NULL` (wszystkie polityki zwrócą FALSE)

**Implikacje dla API endpoints**:
- Nie musimy sprawdzać w kodzie czy `flashcard.user_id === currentUser.id`
- RLS robi to automatycznie
- Kod jest prostszy i bezpieczniejszy

**Przykład przed RLS** (potrzebna ręczna walidacja):
```typescript
const { data: flashcard } = await supabase
  .from('flashcards')
  .select()
  .eq('id', flashcardId)
  .single();

// Ręczna walidacja autoryzacji
if (flashcard.user_id !== currentUser.id) {
  return new Response('Forbidden', { status: 403 });
}
```

**Przykład z RLS** (automatyczna filtracja):
```typescript
// RLS automatycznie filtruje wyniki
const { data: flashcard } = await supabase
  .from('flashcards')
  .select()
  .eq('id', flashcardId)
  .single();

// Jeśli flashcard nie należy do użytkownika, `data` będzie null
if (!flashcard) {
  return new Response('Not found', { status: 404 });
}
```

#### 3.6.5. Testowanie RLS

**Testy do wykonania**:
1. Zalogowany użytkownik A próbuje odczytać fiszki użytkownika B → brak wyników
2. Zalogowany użytkownik A próbuje edytować fiszkę użytkownika B → błąd/brak efektu
3. Zalogowany użytkownik A próbuje usunąć fiszkę użytkownika B → błąd/brak efektu
4. Niezalogowany użytkownik próbuje odczytać jakiekolwiek fiszki → brak wyników
5. Użytkownik A tworzy fiszkę → automatycznie ustawiane `user_id = A`

**Narzędzia testowania**:
- SQL Editor w Supabase Dashboard z funkcją `SELECT auth.uid()`
- API calls z różnymi tokenami JWT
- Automatyczne testy integracyjne (np. Vitest + Supabase Test Helpers)

### 3.7. Migracja bazy danych - dodanie CASCADE

**Wymóg**: Przy usunięciu konta użytkownika, wszystkie powiązane dane (fiszki, generacje, logi) muszą zostać automatycznie usunięte.

**Rozwiązanie**: Relacje `ON DELETE CASCADE` w schemacie bazy danych.

#### 3.7.1. Migracja schematu

**Lokalizacja**: Migracje Supabase (SQL Editor w Dashboard lub pliki migracji)

**SQL do wykonania**:

```sql
-- Dodanie CASCADE do istniejących kluczy obcych

-- Tabela flashcards: user_id
ALTER TABLE flashcards
DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey,
ADD CONSTRAINT flashcards_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Tabela flashcards: generation_id (opcjonalne CASCADE)
ALTER TABLE flashcards
DROP CONSTRAINT IF EXISTS flashcards_generation_id_fkey,
ADD CONSTRAINT flashcards_generation_id_fkey
  FOREIGN KEY (generation_id)
  REFERENCES generations(id)
  ON DELETE SET NULL;  -- Jeśli generacja usunięta, fiszka pozostaje

-- Tabela generations: user_id
ALTER TABLE generations
DROP CONSTRAINT IF EXISTS generations_user_id_fkey,
ADD CONSTRAINT generations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Tabela generation_error_logs: user_id
ALTER TABLE generation_error_logs
DROP CONSTRAINT IF EXISTS generation_error_logs_user_id_fkey,
ADD CONSTRAINT generation_error_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Tabela generation_error_logs: generation_id (opcjonalne CASCADE)
ALTER TABLE generation_error_logs
DROP CONSTRAINT IF EXISTS generation_error_logs_generation_id_fkey,
ADD CONSTRAINT generation_error_logs_generation_id_fkey
  FOREIGN KEY (generation_id)
  REFERENCES generations(id)
  ON DELETE SET NULL;
```

**Efekt CASCADE**:
- Usunięcie użytkownika (via `deleteUser()`) automatycznie usuwa:
  - Wszystkie jego fiszki (`flashcards`)
  - Wszystkie jego generacje (`generations`)
  - Wszystkie jego logi błędów (`generation_error_logs`)
- Nie trzeba ręcznie usuwać danych w kodzie

## 4. PODSUMOWANIE I LISTA KOMPONENTÓW DO IMPLEMENTACJI

### 4.1. Strony Astro (7 nowych + 2 modyfikacje)

**Nowe strony**:
1. `/src/pages/auth/login.astro` - Strona logowania
2. `/src/pages/auth/register.astro` - Strona rejestracji
3. `/src/pages/auth/forgot-password.astro` - Strona żądania resetu hasła
4. `/src/pages/auth/reset-password.astro` - Strona ustawiania nowego hasła
5. `/src/pages/auth/verify-email.astro` - Strona potwierdzenia weryfikacji emaila
6. `/src/pages/account/settings.astro` - Strona ustawień konta
7. `/src/pages/api/account/index.ts` - Endpoint API do usunięcia konta

**Modyfikacje istniejących**:
1. `/src/pages/generate.astro` - Odkomentowanie auth guard
2. `/src/pages/index.astro` - Warunkowe renderowanie dla auth/non-auth
3. `/src/layouts/Layout.astro` - Dodanie nawigacji auth

### 4.2. Komponenty React (6 nowych)

1. `/src/components/auth/LoginForm.tsx` - Formularz logowania
2. `/src/components/auth/RegisterForm.tsx` - Formularz rejestracji
3. `/src/components/auth/ForgotPasswordForm.tsx` - Formularz żądania resetu hasła
4. `/src/components/auth/ResetPasswordForm.tsx` - Formularz ustawiania nowego hasła
5. `/src/components/account/AccountSettings.tsx` - Panel ustawień konta
6. `/src/components/layout/Navigation.tsx` - Komponent nawigacji

### 4.3. Serwisy i helpery (3 nowe)

1. `/src/lib/services/auth.service.ts` - Serwis autentykacji (wrapper Supabase Auth)
2. `/src/lib/schemas/auth.schema.ts` - Schematy walidacji Zod dla autentykacji
3. `/src/lib/helpers/auth-error.ts` - Helper do mapowania błędów Supabase

### 4.4. Modyfikacje middleware i typów (2 modyfikacje)

1. `/src/middleware/index.ts` - Rozszerzenie o obsługę sesji i `locals.user`
2. `/src/env.d.ts` - Dodanie typów dla `locals.user`

### 4.5. Konfiguracja Supabase

**W Supabase Dashboard**:
1. Konfiguracja URL przekierowań
2. Customizacja email templates
3. Ustawienie password policies
4. Utworzenie polityk RLS dla wszystkich tabel
5. Wykonanie migracji CASCADE dla kluczy obcych
6. Wygenerowanie i zapisanie `SUPABASE_SERVICE_ROLE_KEY`

### 4.6. Zmienne środowiskowe

**Nowe zmienne w `.env`**:
```bash
PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 4.7. Kolejność implementacji (sugerowana)

**Faza 1: Fundament (backend i auth service)**
1. Konfiguracja Supabase Auth w Dashboard
2. Implementacja polityk RLS i migracji CASCADE
3. Utworzenie `/src/lib/schemas/auth.schema.ts`
4. Utworzenie `/src/lib/services/auth.service.ts`
5. Utworzenie `/src/lib/helpers/auth-error.ts`
6. Modyfikacja middleware `/src/middleware/index.ts`

**Faza 2: UI autentykacji (strony i komponenty)**
1. Implementacja komponentów UI:
   - `LoginForm.tsx`
   - `RegisterForm.tsx`
   - `ForgotPasswordForm.tsx`
   - `ResetPasswordForm.tsx`
2. Implementacja stron:
   - `login.astro`
   - `register.astro`
   - `forgot-password.astro`
   - `reset-password.astro`
   - `verify-email.astro`

**Faza 3: Nawigacja i layout**
1. Implementacja `Navigation.tsx`
2. Modyfikacja `Layout.astro`
3. Modyfikacja `index.astro`

**Faza 4: Chrononione zasoby**
1. Modyfikacja `generate.astro` (odkomentowanie auth guard)
2. Implementacja `account/settings.astro`
3. Implementacja `AccountSettings.tsx`
4. Implementacja endpoint `DELETE /api/account`

**Faza 5: Testowanie i walidacja**
1. Testy manualne wszystkich przepływów użytkownika
2. Testy RLS (próba dostępu do cudzych danych)
3. Testy usunięcia konta (CASCADE)
4. Testy walidacji (błędne dane, wygasłe tokeny)

### 4.8. Metryki i monitorowanie (poza zakresem MVP, ale warto zaplanować)

**Logowanie zdarzeń autentykacji**:
- Successful/failed login attempts
- Registration count
- Password reset requests
- Account deletions

**Integracja z narzędziami**:
- Supabase Analytics (wbudowane)
- Custom logging do tabeli `auth_logs` (opcjonalnie)

---

## Koniec specyfikacji

Dokument przedstawia kompletną architekturę systemu autentykacji dla aplikacji SmartFlash, zgodną z wymaganiami PRD (US-003, US-004, US-009-US-014, US-018) i stackiem technologicznym (Astro 5, Supabase Auth, React 19, TypeScript 5).

**Kluczowe decyzje architektoniczne**:
- Wykorzystanie Supabase Auth jako backend autentykacji (zmniejsza złożoność, zwiększa bezpieczeństwo)
- SSR w Astro dla lepszego UX i SEO (auth guard server-side, brak flashowania)
- RLS w PostgreSQL jako główny mechanizm autoryzacji (automatyczna filtracja danych)
- Komponenty React dla interaktywności formularzy (z dyrektywą `client:load`)
- Zod dla walidacji danych po stronie klienta i serwera
- JWT tokeny zarządzane przez Supabase SDK (automatyczne odświeżanie)
- CASCADE w relacjach FK dla automatycznego usuwania danych użytkownika

**Kolejne kroki**: Implementacja według zaproponowanej kolejności faz, testowanie każdej fazy przed przejściem do następnej.
