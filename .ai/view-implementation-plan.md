# API Endpoint Implementation Plan: Update Flashcard (PUT /api/flashcards/{id})

## 1. Przegląd punktu końcowego

Endpoint umożliwia użytkownikowi aktualizację treści istniejącej fiszki (front i/lub back). Tylko właściciel fiszki może ją modyfikować. Endpoint respektuje ograniczenia długości oraz zapewnia unikalność pola `front` w obrębie fiszek danego użytkownika.

**Cel biznesowy:**

- Umożliwienie użytkownikom edycji i poprawy istniejących fiszek
- Wsparcie dla scenariusza: użytkownik zaakceptował kandydata AI, ale chce później dopracować treść
- Zachowanie integralności danych poprzez walidację i zabezpieczenia

## 2. Szczegóły żądania

### Metoda HTTP i URL

- **Metoda:** PUT
- **Ścieżka:** `/api/flashcards/{id}`
- **Przykład:** `PUT /api/flashcards/550e8400-e29b-41d4-a716-446655440000`

### Parametry

#### Path Parameters

- **id** (wymagany)
  - Typ: UUID
  - Opis: Unikalny identyfikator fiszki do zaktualizowania

#### Headers

- **Authorization** (wymagany)
  - Format: `Bearer <access_token>`
  - Opis: JWT token wystawiony przez Supabase Auth

#### Request Body (JSON)

Minimum jedno pole musi być dostarczone:

```json
{
  "front": "string (opcjonalny, 1-200 znaków)",
  "back": "string (opcjonalny, 1-500 znaków)"
}
```

**Przykład żądania:**

```json
{
  "front": "Co to jest JavaScript?",
  "back": "JavaScript to interpretowany język programowania używany głównie do tworzenia interaktywnych stron internetowych."
}
```

### Walidacja parametrów wejściowych

**Zod Schema (do utworzenia w endpoint):**

```typescript
import { z } from "zod";

const UpdateFlashcardSchema = z
  .object({
    front: z
      .string()
      .min(1, "Front nie może być pusty")
      .max(200, "Front może zawierać maksymalnie 200 znaków")
      .optional(),
    back: z.string().min(1, "Back nie może być pusty").max(500, "Back może zawierać maksymalnie 500 znaków").optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "Co najmniej jedno pole (front lub back) musi być dostarczone",
  });
```

## 3. Wykorzystywane typy

### DTOs (z `src/types.ts`)

**Request:**

```typescript
// Używane do walidacji i typowania request body
export type UpdateFlashcardCommand = Partial<Pick<FlashcardUpdate, "front" | "back" | "source">>;
```

**Response:**

```typescript
// Zwracane po pomyślnej aktualizacji
export type FlashcardDTO = Pick<
  FlashcardRow,
  "id" | "front" | "back" | "source" | "generation_id" | "created_at" | "updated_at"
>;
```

### Typy bazodanowe (z `src/db/database.types.ts`)

- `FlashcardUpdate` - typ dla operacji UPDATE
- `FlashcardRow` - pełny rekord z bazy danych

### Typy błędów

```typescript
type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

Zwraca zaktualizowaną fiszkę w formacie `FlashcardDTO`.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "front": "Co to jest JavaScript?",
  "back": "JavaScript to interpretowany język programowania używany głównie do tworzenia interaktywnych stron internetowych.",
  "source": "manual",
  "generation_id": null,
  "created_at": "2026-01-20T10:30:00.000Z",
  "updated_at": "2026-01-25T14:45:30.000Z"
}
```

### Błędy

#### 400 Bad Request

Nieprawidłowe dane wejściowe.

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dane wejściowe są nieprawidłowe",
    "details": {
      "front": "Front może zawierać maksymalnie 200 znaków",
      "back": "Back nie może być pusty"
    }
  }
}
```

#### 401 Unauthorized

Brak lub nieprawidłowy token autoryzacji.

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Wymagana autoryzacja"
  }
}
```

#### 403 Forbidden

Użytkownik nie jest właścicielem fiszki.

```json
{
  "error": {
    "code": "forbidden",
    "message": "Nie masz uprawnień do modyfikacji tej fiszki"
  }
}
```

#### 404 Not Found

Fiszka o podanym ID nie istnieje.

```json
{
  "error": {
    "code": "not_found",
    "message": "Fiszka nie została znaleziona"
  }
}
```

#### 409 Conflict

Próba ustawienia front na wartość już istniejącą u użytkownika.

```json
{
  "error": {
    "code": "duplicate_front",
    "message": "Fiszka z taką treścią front już istnieje"
  }
}
```

#### 500 Internal Server Error

Błąd serwera lub bazy danych.

```json
{
  "error": {
    "code": "internal_error",
    "message": "Wystąpił błąd serwera. Spróbuj ponownie później."
  }
}
```

## 5. Przepływ danych

### Diagram sekwencji

```
Client -> Astro Endpoint: PUT /api/flashcards/{id}
                            + Authorization: Bearer <token>
                            + Body: { front?, back? }

Astro Endpoint -> Middleware: Verify JWT & extract user_id
Middleware --> Astro Endpoint: user_id

Astro Endpoint -> Zod: Validate request body
Zod --> Astro Endpoint: Validated data OR errors

Astro Endpoint -> FlashcardsService: updateFlashcard(user_id, id, data)

FlashcardsService -> Supabase: Check ownership (SELECT)
Supabase --> FlashcardsService: flashcard OR null

[IF not found OR wrong user]
FlashcardsService --> Astro Endpoint: 404/403 error

[IF found and authorized]
FlashcardsService -> Supabase: UPDATE flashcards
                                SET front = ?, back = ?, updated_at = now()
                                WHERE id = ? AND user_id = ?

[IF unique constraint violated]
Supabase --> FlashcardsService: Unique violation error
FlashcardsService --> Astro Endpoint: 409 Conflict

[IF success]
Supabase --> FlashcardsService: Updated flashcard
FlashcardsService --> Astro Endpoint: FlashcardDTO

Astro Endpoint -> Client: 200 OK + FlashcardDTO
```

### Krok po kroku

1. **Odbiór żądania:**
   - Endpoint odbiera żądanie PUT z id w URL i body
   - Middleware Astro weryfikuje JWT token z nagłówka Authorization
   - Ekstrahuje `user_id` z tokenu (Supabase auth.uid())

2. **Walidacja danych wejściowych:**
   - Walidacja body za pomocą Zod schema
   - Sprawdzenie czy co najmniej jedno pole jest obecne
   - Walidacja długości front (1-200) i back (1-500)

3. **Weryfikacja własności:**
   - Wywołanie `FlashcardsService.updateFlashcard()`
   - Service sprawdza czy fiszka istnieje i należy do użytkownika
   - Wykorzystanie RLS + server-side check dla defense in depth

4. **Aktualizacja w bazie:**
   - Wykonanie UPDATE przez Supabase client
   - Automatyczna aktualizacja pola `updated_at` (trigger w bazie)
   - RLS automatycznie zapewnia że tylko właściciel może aktualizować

5. **Obsługa unique constraint:**
   - Jeśli front jest aktualizowany, Postgres sprawdzi UNIQUE (user_id, front)
   - Jeśli naruszenie - zwrot 409 Conflict

6. **Zwrot odpowiedzi:**
   - Pobranie zaktualizowanego rekordu
   - Mapowanie na FlashcardDTO
   - Zwrot 200 OK z body

## 6. Względy bezpieczeństwa

### Uwierzytelnianie i autoryzacja

1. **JWT Verification:**
   - Middleware musi weryfikować token JWT z Supabase
   - Token przekazany w nagłówku `Authorization: Bearer <token>`
   - Ekstrahować `user_id` z tokenu (`auth.uid()`)
   - Jeśli token nieprawidłowy/wygasły - zwrot 401

2. **Weryfikacja własności (Ownership Check):**
   - **RLS (Row-Level Security):** Włączony w bazie, polityka `UPDATE: user_id = auth.uid()`
   - **Server-side check:** Dodatkowa walidacja w service layer przed aktualizacją
   - Defense in depth: weryfikacja na poziomie aplikacji i bazy

3. **CORS:**
   - Ograniczenie do dozwolonych origin (web client)
   - Prawidłowa konfiguracja CORS headers w Astro

### Walidacja i sanitizacja danych

1. **Input Validation:**
   - Zod schema dla strukturalnej walidacji
   - Sprawdzenie długości pól (front ≤ 200, back ≤ 500)
   - Sprawdzenie że co najmniej jedno pole jest obecne

2. **Sanitization:**
   - Usunięcie znaków kontrolnych z `front` i `back`
   - Trimowanie białych znaków na początku/końcu
   - Escape potencjalnie niebezpiecznych znaków (jeśli wyświetlane w HTML)

3. **SQL Injection Protection:**
   - Supabase client automatycznie parametryzuje zapytania
   - Nie używać raw SQL queries z interpolacją

### Rate Limiting

- Implementacja rate limiting per user: np. 60 requests/min
- Szczególna ochrona przed abuse: np. maksymalnie 10 UPDATE operations/min per user
- Zwrot 429 Too Many Requests gdy limit przekroczony

### Logging i monitoring

1. **Log successful updates:**
   - `user_id`, `flashcard_id`, timestamp
   - Nie logować pełnej treści fiszek (GDPR)

2. **Log failed attempts:**
   - 403/404 errors mogą wskazywać próby nieautoryzowanego dostępu
   - Monitorowanie wzorców abuse

3. **Security events:**
   - Multiple 401/403 errors z tego samego IP/user - potencjalny atak
   - Alerting dla administratorów

## 7. Obsługa błędów

### Strategia obsługi błędów

**Wzorzec Guard Clauses:**

- Walidacja i obsługa błędów na początku funkcji
- Early returns dla error conditions
- Happy path na końcu funkcji

**Centralized Error Handler:**

- Helper function do formatowania błędów w standardowy format API
- Spójne kody błędów i komunikaty

### Szczegółowe scenariusze błędów

#### 1. Błąd walidacji (400)

**Przyczyny:**

- Front > 200 znaków lub pusty string
- Back > 500 znaków lub pusty string
- Brak front i back w request body
- Nieprawidłowy format JSON

**Obsługa:**

```typescript
try {
  const data = UpdateFlashcardSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "validation_error",
          message: "Dane wejściowe są nieprawidłowe",
          details: error.flatten().fieldErrors,
        },
      }),
      { status: 400 }
    );
  }
}
```

#### 2. Brak autoryzacji (401)

**Przyczyny:**

- Brak nagłówka Authorization
- Nieprawidłowy format tokenu
- Token wygasły
- Token niepodpisany przez Supabase

**Obsługa:**

```typescript
const user = await supabase.auth.getUser();
if (!user || user.error) {
  return new Response(
    JSON.stringify({
      error: {
        code: "unauthorized",
        message: "Wymagana autoryzacja",
      },
    }),
    { status: 401 }
  );
}
```

#### 3. Brak uprawnień (403)

**Przyczyny:**

- Użytkownik próbuje aktualizować fiszkę innego użytkownika

**Obsługa:**

```typescript
const flashcard = await getFlashcard(id, userId);
if (flashcard && flashcard.user_id !== userId) {
  return new Response(
    JSON.stringify({
      error: {
        code: "forbidden",
        message: "Nie masz uprawnień do modyfikacji tej fiszki",
      },
    }),
    { status: 403 }
  );
}
```

#### 4. Nie znaleziono (404)

**Przyczyny:**

- Fiszka o podanym ID nie istnieje
- Fiszka została usunięta
- Nieprawidłowy format UUID

**Obsługa:**

```typescript
const flashcard = await getFlashcard(id, userId);
if (!flashcard) {
  return new Response(
    JSON.stringify({
      error: {
        code: "not_found",
        message: "Fiszka nie została znaleziona",
      },
    }),
    { status: 404 }
  );
}
```

#### 5. Konflikt unikalności (409)

**Przyczyny:**

- Użytkownik próbuje zmienić front na wartość która już istnieje w jego fiszkach

**Obsługa:**

```typescript
try {
  const result = await supabase
    .from("flashcards")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
} catch (error) {
  // Check for unique constraint violation (Postgres error code 23505)
  if (error.code === "23505" || error.message?.includes("unique")) {
    return new Response(
      JSON.stringify({
        error: {
          code: "duplicate_front",
          message: "Fiszka z taką treścią front już istnieje",
        },
      }),
      { status: 409 }
    );
  }
}
```

#### 6. Błąd serwera (500)

**Przyczyny:**

- Błąd połączenia z bazą danych
- Timeout zapytania
- Nieoczekiwany błąd aplikacji

**Obsługa:**

```typescript
try {
  // ... main logic
} catch (error) {
  console.error("Unexpected error updating flashcard:", error);
  return new Response(
    JSON.stringify({
      error: {
        code: "internal_error",
        message: "Wystąpił błąd serwera. Spróbuj ponownie później.",
      },
    }),
    { status: 500 }
  );
}
```

### Error Response Helper

```typescript
// src/lib/helpers/api-error.ts
export function createErrorResponse(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Zapytanie do bazy danych:**
   - UPDATE query może być wolne przy dużej liczbie rekordów
   - Index na `id` i `user_id` są kluczowe (już zaplanowane w db-plan.md)

2. **Weryfikacja JWT:**
   - Każde żądanie wymaga weryfikacji tokenu
   - Supabase client cache'uje zweryfikowane tokeny

3. **Unique constraint check:**
   - Sprawdzenie unikalności front wymaga skanowania indexu
   - Index na `(user_id, front)` UNIQUE już istnieje (z db schema)

### Strategie optymalizacji

#### 1. Indexy bazy danych

Już zaplanowane w `db-plan.md`:

- Index na `flashcards(user_id)` - dla RLS i ownership check
- Unique index na `flashcards(user_id, front)` - dla constraint enforcement

Dodatkowo rozważyć:

```sql
-- Composite index dla UPDATE query
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id_id
ON flashcards(user_id, id);
```

#### 2. Connection Pooling

- Supabase automatycznie zarządza connection pooling
- Upewnić się że limits są odpowiednio skonfigurowane

#### 3. Caching

**Nie cachować** zaktualizowanych danych - zawsze zwracać świeże dane z bazy aby uniknąć inconsistency.

**Cachować** można:

- Zweryfikowane JWT tokeny (Supabase robi to automatycznie)

#### 4. Database Trigger Optimization

Upewnić się że trigger aktualizujący `updated_at` jest efektywny:

```sql
-- Trigger dla updated_at (jeśli nie istnieje)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 5. Minimalizacja round-trips

Wykorzystać Supabase's `.select()` po `.update()` aby pobrać zaktualizowany rekord w jednym zapytaniu:

```typescript
const { data, error } = await supabase
  .from("flashcards")
  .update({ front, back, updated_at: new Date().toISOString() })
  .eq("id", id)
  .eq("user_id", userId)
  .select()
  .single();
```

#### 6. Request timeout

Ustawić rozsądny timeout dla request (np. 5s):

```typescript
// W Astro endpoint
export const prerender = false;

// Consider adding timeout
const TIMEOUT_MS = 5000;
```

### Monitoring wydajności

**Metryki do śledzenia:**

- Średni czas odpowiedzi (target: < 200ms dla p95)
- Liczba błędów 500 (target: < 0.1%)
- Czas wykonania UPDATE query (target: < 50ms)
- Rate limiting violations

**Narzędzia:**

- Supabase Dashboard - monitoring zapytań DB
- Application logs - tracking request duration
- APM (np. Sentry) - dla error tracking i performance monitoring

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska

**1.1. Sprawdzenie migracji bazy danych**

```bash
# Verify indexes exist
# Check supabase/migrations/ for indexes on flashcards table
```

**1.2. Sprawdzenie typów**

- Upewnić się że `src/types.ts` zawiera `UpdateFlashcardCommand` i `FlashcardDTO`
- Upewnić się że `src/db/database.types.ts` jest aktualny (run `supabase gen types`)

### Krok 2: Utworzenie service layer

**2.1. Utworzyć `src/lib/services/flashcards.service.ts`** (jeśli nie istnieje)

```typescript
// src/lib/services/flashcards.service.ts
import type { SupabaseClient } from "../db/supabase.client";
import type { UpdateFlashcardCommand, FlashcardDTO } from "../../types";

export class FlashcardsService {
  constructor(private supabase: SupabaseClient) {}

  async updateFlashcard(userId: string, cardId: string, data: UpdateFlashcardCommand): Promise<FlashcardDTO | null> {
    // Implementation here
  }

  async getFlashcard(userId: string, cardId: string): Promise<FlashcardDTO | null> {
    // Implementation here
  }
}
```

**2.2. Implementacja `updateFlashcard` method**

```typescript
async updateFlashcard(
  userId: string,
  cardId: string,
  data: UpdateFlashcardCommand
): Promise<FlashcardDTO | null> {
  // Guard: Check flashcard exists and belongs to user
  const existing = await this.getFlashcard(userId, cardId);
  if (!existing) {
    return null;
  }

  // Prepare update data with timestamp
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  };

  // Execute update with RLS enforcement
  const { data: updated, error } = await this.supabase
    .from('flashcards')
    .update(updateData)
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return updated as FlashcardDTO;
}
```

**2.3. Implementacja `getFlashcard` helper**

```typescript
async getFlashcard(
  userId: string,
  cardId: string
): Promise<FlashcardDTO | null> {
  const { data, error } = await this.supabase
    .from('flashcards')
    .select('id, front, back, source, generation_id, created_at, updated_at')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as FlashcardDTO;
}
```

### Krok 3: Utworzenie helper dla błędów API

**3.1. Utworzyć `src/lib/helpers/api-error.ts`**

```typescript
export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "duplicate_front"
  | "internal_error";

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; message?: string };
    return err.code === "23505" || err.message?.includes("unique") || false;
  }
  return false;
}
```

### Krok 4: Utworzenie Zod schema dla walidacji

**4.1. Utworzyć `src/lib/schemas/flashcard.schema.ts`**

```typescript
import { z } from "zod";

export const UpdateFlashcardSchema = z
  .object({
    front: z
      .string()
      .min(1, "Front nie może być pusty")
      .max(200, "Front może zawierać maksymalnie 200 znaków")
      .optional(),
    back: z.string().min(1, "Back nie może być pusty").max(500, "Back może zawierać maksymalnie 500 znaków").optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "Co najmniej jedno pole (front lub back) musi być dostarczone",
  });
```

### Krok 5: Implementacja API endpoint

**5.1. Utworzyć `src/pages/api/flashcards/[id].ts`**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { UpdateFlashcardSchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardsService } from "../../../lib/services/flashcards.service";
import { createErrorResponse, isUniqueConstraintError } from "../../../lib/helpers/api-error";

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
  // Step 1: Extract and validate card ID
  const { id } = params;
  if (!id) {
    return createErrorResponse("validation_error", "ID fiszki jest wymagane", 400);
  }

  // Step 2: Verify authentication
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse("unauthorized", "Wymagana autoryzacja", 401);
  }

  // Step 3: Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("validation_error", "Nieprawidłowy format JSON", 400);
  }

  let validatedData;
  try {
    validatedData = UpdateFlashcardSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "validation_error",
        "Dane wejściowe są nieprawidłowe",
        400,
        error.flatten().fieldErrors
      );
    }
    throw error;
  }

  // Step 4: Update flashcard via service
  const flashcardsService = new FlashcardsService(supabase);

  try {
    const updatedFlashcard = await flashcardsService.updateFlashcard(user.id, id, validatedData);

    if (!updatedFlashcard) {
      return createErrorResponse("not_found", "Fiszka nie została znaleziona", 404);
    }

    // Step 5: Return success response
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle unique constraint violation
    if (isUniqueConstraintError(error)) {
      return createErrorResponse("duplicate_front", "Fiszka z taką treścią front już istnieje", 409);
    }

    // Log unexpected errors
    console.error("Error updating flashcard:", error);

    return createErrorResponse("internal_error", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
};
```

### Krok 6: Aktualizacja middleware (jeśli potrzebne)

**6.1. Sprawdzić `src/middleware/index.ts`**

Upewnić się że middleware:

- Inicjalizuje Supabase client i dodaje do `locals`
- Nie blokuje API routes

```typescript
// src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  // Initialize Supabase client
  locals.supabase = createServerClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => request.headers.get(key),
      set: () => {}, // Read-only for API routes
      remove: () => {},
    },
  });

  return next();
});
```

### Krok 8: Dokumentacja

**8.1. Dodać JSDoc comments do funkcji**
**8.2. Zaktualizować API documentation** (jeśli istnieje)
**8.3. Dodać przykłady użycia w README** (jeśli dotyczy)

### Krok 9: Code review i linting

**9.1. Uruchomić linter**

```bash
npm run lint
```

**9.2. Sprawdzić TypeScript errors**

```bash
npm run type-check
```

**9.3. Formatowanie kodu**

```bash
npm run format
```

**9.4. Code review checklist:**

- [ ] Walidacja wszystkich inputów
- [ ] Prawidłowa obsługa błędów
- [ ] Security checks (authorization, sanitization)
- [ ] Performance considerations (indexes, queries)
- [ ] Code style zgodny z projektem
- [ ] Testy pokrywają edge cases
- [ ] Dokumentacja aktualna

### Krok 10: Deployment

**10.1. Merge do feature branch**
**10.2. Uruchomić CI/CD pipeline** (GitHub Actions)
**10.3. Deploy do staging environment**
**10.4. Smoke tests na staging**
**10.5. Deploy do production** (po zatwierdzeniu)
**10.6. Monitoring po deployment:**

- Sprawdzić error rate
- Sprawdzić response times
- Sprawdzić czy endpoint jest dostępny

---

## Podsumowanie

Ten plan implementacji zapewnia:

✅ **Bezpieczeństwo**: JWT auth, ownership validation, RLS, input sanitization  
✅ **Walidację**: Zod schemas, business rules, unique constraints  
✅ **Wydajność**: Optimized queries, proper indexes, minimal round-trips  
✅ **Obsługę błędów**: Comprehensive error handling z czytelnymi komunikatami  
✅ **Architekturę**: Clean separation (endpoint → service → database)
✅ **Zgodność ze standardami**: Follows project rules and tech stack

**Szacowany czas implementacji:** 3-4 godziny (w tym testy i dokumentacja)

**Zależności:**

- Baza danych z tabelą `flashcards` i odpowiednimi indexes
- Supabase Auth skonfigurowany
- Middleware inicjalizujący Supabase client
- Typy w `src/types.ts` i `src/db/database.types.ts`

**Kolejne kroki po implementacji:**

- Zaimplementować pozostałe flashcard endpoints (GET, POST, DELETE)
- Dodać rate limiting middleware
- Zaimplementować frontend client do konsumpcji API
- Dodać monitoring i alerting
