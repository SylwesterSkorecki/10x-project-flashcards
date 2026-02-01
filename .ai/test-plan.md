# Plan Testów - SmartFlash (Aplikacja do generowania fiszek AI)

## 1. Wprowadzenie i cele testowania

### Cel projektu

SmartFlash to aplikacja webowa umożliwiająca użytkownikom generowanie fiszek edukacyjnych przy użyciu sztucznej inteligencji. Aplikacja wykorzystuje modele AI (poprzez OpenRouter.ai) do automatycznego tworzenia pytań i odpowiedzi na podstawie tekstu źródłowego dostarczanego przez użytkownika.

### Cele testowania

- **Zapewnienie wysokiej jakości** kodu i funkcjonalności przed wdrożeniem na produkcję
- **Weryfikacja poprawności** kluczowych funkcji aplikacji (uwierzytelnianie, generowanie fiszek, zarządzanie danymi)
- **Identyfikacja i eliminacja** krytycznych błędów bezpieczeństwa, szczególnie w obszarze autoryzacji i dostępu do danych
- **Potwierdzenie stabilności** integracji z zewnętrznymi serwisami (Supabase, OpenRouter.ai)
- **Zapewnienie zgodności** z wymaganiami funkcjonalnymi i niefunkcjonalnymi
- **Walidacja UX/UI** w kluczowych przepływach użytkownika

## 2. Zakres testów

### W zakresie testów:

- ✅ Wszystkie komponenty React (auth, generate, layout, settings)
- ✅ Wszystkie API endpoints Astro
- ✅ Warstwy serwisów (FlashcardsService, GenerationsService, OpenRouterService)
- ✅ Middleware uwierzytelniania
- ✅ Schematy walidacji Zod
- ✅ Integracja z Supabase (Auth, Database)
- ✅ Integracja z OpenRouter.ai (mockowana w większości testów)
- ✅ Row Level Security (RLS) w bazie danych
- ✅ Przepływy użytkownika (user flows) - rejestracja, logowanie, generowanie, zarządzanie fiszkami
- ✅ Obsługa błędów i edge cases
- ✅ Bezpieczeństwo (autoryzacja, weryfikacja własności, XSS, CSRF)

### Poza zakresem testów:

- ❌ Testy wydajnościowe pod dużym obciążeniem (stress testing)
- ❌ Testy penetracyjne (security penetration testing)
- ❌ Testy kompatybilności z przeglądarkami starszymi niż 2 lata
- ❌ Testy urządzeń mobilnych poza najpopularniejszymi
- ❌ Monitorowanie produkcyjne i analityka
- ❌ Infrastruktura CI/CD (Github Actions) - testy jej konfiguracji

## 3. Typy testów do przeprowadzenia

### 3.1. Testy jednostkowe (Unit Tests)

**Narzędzie**: Vitest + React Testing Library

**Zakres**:

- Serwisy (`src/lib/services/`):
  - `FlashcardsService` - getFlashcard, updateFlashcard
  - `GenerationsService` - generateFlashcards, estimateGenerationCost, metody prywatne
  - `OpenRouterService` - retry logic, circuit breaker, rate limiting, walidacja odpowiedzi
- Schematy walidacji (`src/lib/schemas/`):
  - `auth.schema.ts` - walidacja email, hasła, tokenu resetu
  - `flashcard.schema.ts` - walidacja front/back, source
- Utility functions i helpery
- Hooki React:
  - `useGenerateFlow` - zarządzanie stanem kandydatów
- Komponenty React (izolowane):
  - Komponenty UI (Button, Input, Textarea, Dialog)
  - Komponenty prezentacyjne (CandidateCard, CandidatesList)

**Kryteria**:

- Pokrycie kodu: minimum 80% dla serwisów i schematów
- Każda funkcja publiczna powinna mieć co najmniej 3 testy (happy path, edge case, error case)

### 3.2. Testy integracyjne (Integration Tests)

**Narzędzie**: Vitest + Supertest (dla API) + testowa baza Supabase

**Zakres**:

- API endpoints z rzeczywistą bazą testową:
  - POST `/api/generations` - generowanie fiszek (z mockowanym OpenRouter)
  - GET `/api/generations/[id]` - pobranie generacji
  - POST `/api/generations/[id]/commit` - zapis kandydatów
  - PUT `/api/flashcards/[id]` - aktualizacja fiszki
- Middleware:
  - `src/middleware/index.ts` - auth guard, ustawienie locals, obsługa OAuth callback
- Integracja Supabase:
  - Auth flow (rejestracja, logowanie, reset hasła)
  - RLS - weryfikacja, że użytkownicy widzą tylko swoje dane
  - Migracje bazy danych
- Bulk operations:
  - Zapis wielu fiszek z obsługą duplikatów
  - Concurrent requests

**Kryteria**:

- Wszystkie API endpoints muszą być przetestowane
- Testy muszą używać testowej bazy danych (Supabase local lub dedykowany projekt testowy)
- Testy muszą być izolowane (rollback po każdym teście)

### 3.3. Testy komponentów (Component Tests)

**Narzędzie**: Vitest + React Testing Library

**Zakres**:

- Komponenty auth z logiką:
  - `LoginForm` - walidacja, obsługa błędów Supabase, przekierowanie
  - `RegisterForm` - walidacja hasła, komunikat sukcesu
  - `ForgotPasswordForm` - wysyłka linku
  - `ResetPasswordForm` - ustawienie nowego hasła
- Komponenty generate:
  - `GeneratePage` - pełny przepływ z mockami
  - `GenerateFormPanel` - walidacja tekstu źródłowego
  - `EditCandidateModal` - edycja kandydata, zapisywanie
  - `CommitResultModal` - wyświetlanie wyników
- Komponenty layout:
  - `Navigation` - menu użytkownika, wylogowanie
  - `AccountSettings` - wyświetlanie danych, usuwanie konta

**Kryteria**:

- Testy interakcji użytkownika (click, input, submit)
- Testy walidacji formularzy
- Testy wyświetlania błędów i komunikatów

### 3.4. Testy end-to-end (E2E)

**Narzędzie**: Playwright

**Zakres**:

- Przepływ rejestracji i weryfikacji email
- Przepływ logowania i wylogowania
- Przepływ zapomnienia hasła i resetu
- Przepływ generowania fiszek:
  1. Wprowadzenie tekstu źródłowego
  2. Wygenerowanie kandydatów
  3. Przegląd i edycja kandydatów
  4. Akceptacja/odrzucenie
  5. Zapis do bazy
- Przepływ aktualizacji fiszki
- Przepływ usuwania konta
- Przepływ obsługi błędów (network error, API error, validation error)

**Kryteria**:

- Testy na różnych przeglądarkach (Chrome, Firefox, Safari)
- Testy responsywności (desktop, tablet, mobile)
- Testy dostępności (a11y) - keyboard navigation, screen reader

### 3.5. Testy bezpieczeństwa (Security Tests)

**Narzędzie**: Manualne + automatyczne (OWASP ZAP opcjonalnie)

**Zakres**:

- **Autoryzacja i autentykacja**:
  - Próba dostępu do zasobów bez logowania
  - Próba dostępu do zasobów innego użytkownika
  - Weryfikacja RLS w bazie danych
  - Session hijacking
- **Walidacja danych**:
  - XSS injection w front/back flashcards
  - SQL injection (teoretycznie niemożliwe przez Supabase client, ale test weryfikacyjny)
  - HTML injection
- **CSRF**:
  - Próba wykonania akcji z zewnętrznego źródła
- **Rate limiting**:
  - Próba wysłania wielu żądań w krótkim czasie
- **Secrets**:
  - Weryfikacja, że API keys nie są eksponowane w response

**Kryteria**:

- Wszystkie testy bezpieczeństwa muszą zakończyć się sukcesem przed wdrożeniem

### 3.6. Testy wydajnościowe (Performance Tests) - ograniczone

**Narzędzie**: Lighthouse, WebPageTest

**Zakres**:

- Czas ładowania strony głównej (index.astro)
- Czas ładowania strony generowania (generate.astro)
- Czas wykonania bulk insert (commit endpoint)
- Czas odpowiedzi API endpoints (< 500ms dla CRUD, < 10s dla generowania)

**Kryteria**:

- Lighthouse score > 90 dla Performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s

### 3.7. Testy regresyjne (Regression Tests)

**Narzędzie**: Zautomatyzowane testy z poprzednich typów + smoke tests

**Zakres**:

- Uruchamiane przed każdym wdrożeniem
- Weryfikacja, że nowe zmiany nie złamały istniejącej funkcjonalności
- Smoke tests dla kluczowych przepływów

**Kryteria**:

- 100% testów regresyjnych musi przejść przed wdrożeniem

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Uwierzytelnianie użytkownika

#### Scenariusz 1.1: Rejestracja nowego użytkownika - happy path

**Warunki wstępne**: Użytkownik nie jest zalogowany, email nie istnieje w systemie
**Kroki**:

1. Użytkownik otwiera `/auth/register`
2. Użytkownik wprowadza email: `test@example.com`
3. Użytkownik wprowadza hasło: `SecurePass123` (spełnia wymagania)
4. Użytkownik wprowadza potwierdzenie hasła: `SecurePass123`
5. Użytkownik klika "Zarejestruj się"

**Oczekiwany rezultat**:

- Konto zostaje utworzone w Supabase
- Email weryfikacyjny zostaje wysłany
- Użytkownik widzi komunikat: "Sprawdź swoją skrzynkę email, aby potwierdzić konto"
- Użytkownik nie jest automatycznie zalogowany

**Priorytet**: Krytyczny

#### Scenariusz 1.2: Rejestracja z niepoprawnym hasłem

**Warunki wstępne**: Użytkownik nie jest zalogowany
**Kroki**:

1. Użytkownik otwiera `/auth/register`
2. Użytkownik wprowadza email: `test@example.com`
3. Użytkownik wprowadza hasło: `weak` (nie spełnia wymagań)
4. Użytkownik klika "Zarejestruj się"

**Oczekiwany rezultat**:

- Formularz pokazuje błąd walidacji: "Hasło musi mieć minimum 10 znaków, zawierać wielką i małą literę oraz cyfrę"
- Konto nie zostaje utworzone

**Priorytet**: Wysoki

#### Scenariusz 1.3: Logowanie z poprawnymi danymi

**Warunki wstępne**: Użytkownik ma zweryfikowane konto
**Kroki**:

1. Użytkownik otwiera `/auth/login`
2. Użytkownik wprowadza email: `test@example.com`
3. Użytkownik wprowadza hasło: `SecurePass123`
4. Użytkownik klika "Zaloguj się"

**Oczekiwany rezultat**:

- Użytkownik zostaje zalogowany
- Sesja zostaje utworzona (cookie)
- Użytkownik zostaje przekierowany na `/generate`

**Priorytet**: Krytyczny

#### Scenariusz 1.4: Logowanie bez weryfikacji email

**Warunki wstępne**: Użytkownik ma konto, ale nie zweryfikował email
**Kroki**:

1. Użytkownik otwiera `/auth/login`
2. Użytkownik wprowadza poprawne dane logowania
3. Użytkownik klika "Zaloguj się"

**Oczekiwany rezultat**:

- Logowanie zostaje odrzucone
- Użytkownik widzi komunikat: "Proszę potwierdzić adres email przed zalogowaniem"

**Priorytet**: Wysoki

#### Scenariusz 1.5: Reset hasła - pełny przepływ

**Warunki wstępne**: Użytkownik ma zweryfikowane konto
**Kroki**:

1. Użytkownik otwiera `/auth/forgot-password`
2. Użytkownik wprowadza email: `test@example.com`
3. Użytkownik klika "Wyślij link resetujący"
4. Użytkownik otrzymuje email z linkiem
5. Użytkownik klika w link (przekierowanie do `/auth/reset-password?token=...`)
6. Użytkownik wprowadza nowe hasło: `NewSecurePass456`
7. Użytkownik wprowadza potwierdzenie hasła: `NewSecurePass456`
8. Użytkownik klika "Ustaw nowe hasło"

**Oczekiwany rezultat**:

- Hasło zostaje zmienione
- Użytkownik widzi komunikat sukcesu
- Użytkownik może zalogować się nowym hasłem

**Priorytet**: Wysoki

### 4.2. Generowanie fiszek

#### Scenariusz 2.1: Generowanie fiszek - happy path

**Warunki wstępne**: Użytkownik jest zalogowany
**Kroki**:

1. Użytkownik otwiera `/generate`
2. Użytkownik wprowadza tekst źródłowy (3000 znaków) o tematyce historycznej
3. Użytkownik klika "Generuj fiszki"
4. System wysyła request do `/api/generations`
5. OpenRouter AI generuje 10 kandydatów
6. Kandydaci wyświetlają się na liście

**Oczekiwany rezultat**:

- Generacja zostaje zapisana w tabeli `generations`
- Użytkownik widzi listę 10 kandydatów ze statusem `pending`
- Każdy kandydat ma akcje: Accept, Edit, Reject
- Czas generowania < 30s

**Priorytet**: Krytyczny

#### Scenariusz 2.2: Generowanie z tekstem poza zakresem

**Warunki wstępne**: Użytkownik jest zalogowany
**Kroki**:

1. Użytkownik otwiera `/generate`
2. Użytkownik wprowadza tekst źródłowy (500 znaków - poniżej minimum)
3. Użytkownik klika "Generuj fiszki"

**Oczekiwany rezultat**:

- Walidacja po stronie klienta pokazuje błąd: "Tekst musi mieć od 1000 do 10000 znaków"
- Request nie jest wysyłany do API

**Priorytet**: Średni

#### Scenariusz 2.3: Edycja kandydata przed akceptacją

**Warunki wstępne**: Użytkownik wygenerował fiszki, kandydaci są widoczne
**Kroki**:

1. Użytkownik klika "Edit" na jednym kandydacie
2. Modal `EditCandidateModal` się otwiera
3. Użytkownik zmienia front z "Pytanie 1" na "Zmodyfikowane pytanie 1"
4. Użytkownik zmienia back z "Odpowiedź 1" na "Zmodyfikowana odpowiedź 1"
5. Użytkownik klika "Zapisz"

**Oczekiwany rezultat**:

- Modal się zamyka
- Kandydat ma zaktualizowane front/back
- Status kandydata zmienia się na `edited`
- Source zostanie ustawiony na `ai-edited` przy zapisie

**Priorytet**: Wysoki

#### Scenariusz 2.4: Akceptacja kandydatów i zapis do bazy

**Warunki wstępne**: Użytkownik wygenerował fiszki, wybrał 5 kandydatów (3 niezmienione, 2 edytowane)
**Kroki**:

1. Użytkownik klika "Accept" na 5 kandydatach
2. Użytkownik klika "Zapisz zaakceptowane fiszki"
3. System wysyła request do POST `/api/generations/[id]/commit`
4. Backend wykonuje bulk insert

**Oczekiwany rezultat**:

- 5 fiszek zostaje zapisanych w tabeli `flashcards`
- 3 fiszki mają source = `ai-full`
- 2 fiszki mają source = `ai-edited`
- `generations.accepted_unedited_count` = 3
- `generations.accepted_edited_count` = 2
- Modal `CommitResultModal` pokazuje: "Zapisano 5 fiszek"

**Priorytet**: Krytyczny

#### Scenariusz 2.5: Zapis z duplikatami

**Warunki wstępne**: Użytkownik ma już fiszkę z front = "Pytanie 1"
**Kroki**:

1. Użytkownik generuje nowe fiszki
2. Jeden z kandydatów ma front = "Pytanie 1" (duplikat)
3. Użytkownik akceptuje wszystkich kandydatów (w tym duplikat)
4. Użytkownik klika "Zapisz zaakceptowane fiszki"

**Oczekiwany rezultat**:

- Duplikat nie zostaje zapisany (unique constraint: user_id + front)
- Pozostałe fiszki zostają zapisane
- Modal pokazuje: "Zapisano X fiszek, pominięto Y (duplikaty)"
- Lista pominiętych fiszek jest widoczna w modalu

**Priorytet**: Wysoki

#### Scenariusz 2.6: Obsługa błędu OpenRouter (timeout)

**Warunki wstępne**: OpenRouter API jest niedostępny lub nie odpowiada
**Kroki**:

1. Użytkownik wprowadza tekst źródłowy
2. Użytkownik klika "Generuj fiszki"
3. OpenRouter nie odpowiada przez 30s

**Oczekiwany rezultat**:

- System wykonuje retry (exponential backoff)
- Po 3 nieudanych próbach zwraca błąd
- Użytkownik widzi komunikat: "Nie udało się wygenerować fiszek. Spróbuj ponownie później."
- Błąd zostaje zapisany w `generation_error_logs`

**Priorytet**: Średni

### 4.3. Zarządzanie fiszkami

#### Scenariusz 3.1: Aktualizacja fiszki

**Warunki wstępne**: Użytkownik jest zalogowany i ma zapisane fiszki
**Kroki**:

1. Użytkownik otwiera listę swoich fiszek (nie zaimplementowane w MVP, ale API istnieje)
2. Użytkownik edytuje fiszkę (front: "Nowe pytanie", back: "Nowa odpowiedź")
3. System wysyła PUT `/api/flashcards/[id]`

**Oczekiwany rezultat**:

- Fiszka zostaje zaktualizowana w bazie
- `updated_at` zostaje ustawiony na aktualny czas
- Użytkownik widzi komunikat sukcesu

**Priorytet**: Średni

#### Scenariusz 3.2: Próba aktualizacji fiszki innego użytkownika

**Warunki wstępne**: Użytkownik A jest zalogowany, istnieje fiszka należąca do użytkownika B
**Kroki**:

1. Użytkownik A wysyła PUT `/api/flashcards/[flashcard_id_B]` z nowymi danymi

**Oczekiwany rezultat**:

- Weryfikacja własności w `FlashcardsService.updateFlashcard()` zwraca błąd
- Response: 404 Not Found (nie ujawniamy, że fiszka istnieje)
- Fiszka użytkownika B nie zostaje zmodyfikowana

**Priorytet**: Krytyczny (bezpieczeństwo)

### 4.4. Bezpieczeństwo i autoryzacja

#### Scenariusz 4.1: Próba dostępu do chronionej strony bez logowania

**Warunki wstępne**: Użytkownik nie jest zalogowany
**Kroki**:

1. Użytkownik próbuje otworzyć `/generate` bezpośrednio (URL)

**Oczekiwany rezultat**:

- Middleware wykrywa brak sesji
- Użytkownik zostaje przekierowany na `/auth/login`
- Query param `?redirect=/generate` jest dodawany (opcjonalnie)

**Priorytet**: Krytyczny

#### Scenariusz 4.2: RLS - próba dostępu do danych innego użytkownika przez SQL

**Warunki wstępne**: Użytkownik A jest zalogowany, istnieją dane użytkownika B
**Kroki**:

1. Użytkownik A próbuje wykonać query: `SELECT * FROM flashcards WHERE user_id = 'user_b_id'`

**Oczekiwany rezultat**:

- RLS blokuje query
- Zwracany jest pusty wynik (nie błąd)
- Użytkownik A nie widzi danych użytkownika B

**Priorytet**: Krytyczny

#### Scenariusz 4.3: XSS injection w treści fiszki

**Warunki wstępne**: Użytkownik jest zalogowany
**Kroki**:

1. Użytkownik tworzy fiszkę z front = `<script>alert('XSS')</script>`
2. Użytkownik zapisuje fiszkę
3. Użytkownik otwiera stronę z listą fiszek

**Oczekiwany rezultat**:

- React automatycznie escape'uje HTML
- Skrypt nie zostaje wykonany
- Treść jest wyświetlana jako tekst: `<script>alert('XSS')</script>`

**Priorytet**: Wysoki

### 4.5. Zarządzanie kontem

#### Scenariusz 5.1: Usunięcie konta

**Warunki wstępne**: Użytkownik jest zalogowany i ma zapisane fiszki
**Kroki**:

1. Użytkownik otwiera `/account/settings`
2. Użytkownik klika "Usuń konto"
3. Modal z potwierdzeniem się otwiera
4. Użytkownik potwierdza usunięcie

**Oczekiwany rezultat**:

- Konto użytkownika zostaje usunięte z `auth.users`
- Wszystkie fiszki użytkownika zostają usunięte (CASCADE)
- Wszystkie generacje użytkownika zostają usunięte (CASCADE)
- Sesja zostaje zamknięta
- Użytkownik zostaje przekierowany na stronę główną

**Priorytet**: Wysoki

## 5. Środowisko testowe

### 5.1. Środowisko lokalne (development)

**Przeznaczenie**: Testy jednostkowe i integracyjne podczas developmentu

**Konfiguracja**:

- Node.js 20+
- Supabase Local (CLI) - baza PostgreSQL w Docker
- Migracje testowe: `20260126000000_disable_rls_for_testing.sql`, `20260126000001_create_test_user.sql`
- Mock OpenRouter API (MSW - Mock Service Worker)
- Zmienne środowiskowe z `.env.test`:
  ```
  SUPABASE_URL=http://localhost:54321
  SUPABASE_KEY=<anon_key_local>
  PUBLIC_SUPABASE_URL=http://localhost:54321
  PUBLIC_SUPABASE_KEY=<anon_key_local>
  OPENROUTER_API_KEY=mock_key
  ```

### 5.2. Środowisko testowe (staging)

**Przeznaczenie**: Testy E2E, testy integracyjne z rzeczywistymi usługami

**Konfiguracja**:

- Dedykowany projekt Supabase (staging)
- Mock OpenRouter API lub dedykowany klucz z limitem kosztów
- Baza danych z seed data dla testów E2E
- URL: `https://staging.smartflash.app` (przykład)
- Zmienne środowiskowe z `.env.staging`
- Reset bazy danych przed każdym pełnym testem E2E (CI/CD)

### 5.3. Środowisko CI/CD (Github Actions)

**Przeznaczenie**: Automatyczne uruchamianie testów przy każdym push/PR

**Konfiguracja**:

- Github Actions workflow: `.github/workflows/test.yml`
- Supabase Local w kontenerze Docker
- Uruchamianie testów jednostkowych + integracyjnych
- Uruchamianie testów E2E z Playwright
- Generowanie coverage report
- Blokowanie merge PR jeśli testy nie przechodzą

### 5.4. Dane testowe (test fixtures)

**Struktura**:

- `tests/fixtures/users.json` - użytkownicy testowi
- `tests/fixtures/flashcards.json` - przykładowe fiszki
- `tests/fixtures/generations.json` - przykładowe generacje
- `tests/fixtures/openrouter-responses.json` - przykładowe odpowiedzi AI

**Seed script**: `tests/seed.ts` - ładowanie danych testowych do bazy

## 6. Narzędzia do testowania

### 6.1. Framework testowy

- **Vitest** - test runner dla testów jednostkowych i integracyjnych
  - Konfiguracja: `vitest.config.ts`
  - Szybszy niż Jest, kompatybilny z Vite/Astro
  - Wsparcie dla TypeScript out of the box

### 6.2. Testy komponentów React

- **React Testing Library** - testowanie komponentów React
  - Philosophy: testowanie zachowania, nie implementacji
  - Wsparcie dla hooków przez `@testing-library/react-hooks`
- **@testing-library/user-event** - symulacja interakcji użytkownika

### 6.3. Testy E2E

- **Playwright** - automatyzacja przeglądarki
  - Konfiguracja: `playwright.config.ts`
  - Wsparcie dla wielu przeglądarek (Chromium, Firefox, WebKit)
  - Screenshot i video recording przy błędach
  - Parallel execution

### 6.4. Mockowanie

- **MSW (Mock Service Worker)** - mockowanie API calls (OpenRouter, Supabase)
- **vitest.mock()** - mockowanie modułów i funkcji

### 6.5. Pokrycie kodu (Code Coverage)

- **Vitest Coverage** (via c8/istanbul)
  - Raport HTML: `coverage/index.html`
  - Threshold: minimum 80% dla serwisów i schematów

### 6.6. Linting i formatowanie

- **ESLint** - analiza statyczna kodu
- **Prettier** - formatowanie kodu
- **TypeScript Compiler** - sprawdzanie typów

### 6.7. Testy dostępności (a11y)

- **@axe-core/playwright** - automatyczne testy dostępności w Playwright
- **eslint-plugin-jsx-a11y** - linting dla dostępności w JSX

### 6.8. Testy wydajnościowe

- **Lighthouse CI** - audyty wydajności w CI/CD
- **WebPageTest** - testy wydajności (manualnie)

### 6.9. Baza danych testowa

- **Supabase CLI** - lokalne środowisko Supabase
  - `supabase start` - uruchomienie lokalnej instancji
  - `supabase db reset` - reset bazy do stanu początkowego
  - `supabase migration up` - aplikowanie migracji

## 7. Harmonogram testów

### Faza 1: Przygotowanie środowiska (Tydzień 1)

- [ ] Instalacja i konfiguracja Vitest
- [ ] Instalacja i konfiguracja React Testing Library
- [ ] Instalacja i konfiguracja Playwright
- [ ] Konfiguracja Supabase Local
- [ ] Utworzenie środowiska staging (dedykowany projekt Supabase)
- [ ] Utworzenie fixtures i seed data
- [ ] Konfiguracja MSW dla mockowania OpenRouter
- [ ] Setup CI/CD pipeline (Github Actions)

### Faza 2: Testy jednostkowe - warstwa serwisów (Tydzień 2)

- [ ] Testy `OpenRouterService` (retry, circuit breaker, rate limiting, walidacja)
- [ ] Testy `GenerationsService` (generateFlashcards, estimateGenerationCost)
- [ ] Testy `FlashcardsService` (getFlashcard, updateFlashcard)
- [ ] Testy schematów Zod (auth, flashcards)
- [ ] Testy utility functions
- [ ] Code coverage report - weryfikacja minimum 80%

### Faza 3: Testy jednostkowe - komponenty React (Tydzień 3)

- [ ] Testy komponentów UI (Button, Input, Textarea, Dialog)
- [ ] Testy `useGenerateFlow` hook
- [ ] Testy `CandidateCard`, `CandidatesList` (prezentacyjne)
- [ ] Testy `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`
- [ ] Testy `EditCandidateModal`, `CommitResultModal`

### Faza 4: Testy integracyjne - API endpoints (Tydzień 4)

- [ ] Setup testowej bazy Supabase z migracjami
- [ ] Testy POST `/api/generations` (z mockowanym OpenRouter)
- [ ] Testy GET `/api/generations/[id]`
- [ ] Testy POST `/api/generations/[id]/commit` (bulk insert, duplikaty)
- [ ] Testy PUT `/api/flashcards/[id]` (CRUD, weryfikacja własności)
- [ ] Testy middleware (auth guard, locals)

### Faza 5: Testy integracyjne - Supabase (Tydzień 5)

- [ ] Testy RLS (Row Level Security) - izolacja danych użytkowników
- [ ] Testy Auth flow (rejestracja, logowanie, reset hasła, weryfikacja email)
- [ ] Testy concurrent requests (race conditions)
- [ ] Testy transakcji bazodanowych

### Faza 6: Testy E2E - przepływy użytkownika (Tydzień 6-7)

- [ ] Setup Playwright z różnymi przeglądarkami
- [ ] Przepływ rejestracji i weryfikacji email
- [ ] Przepływ logowania i wylogowania
- [ ] Przepływ reset hasła
- [ ] Przepływ generowania fiszek (pełny: tekst → generacja → edycja → zapis)
- [ ] Przepływ aktualizacji fiszki
- [ ] Przepływ usuwania konta
- [ ] Testy responsywności (desktop, tablet, mobile)
- [ ] Testy dostępności (keyboard navigation, screen reader)

### Faza 7: Testy bezpieczeństwa (Tydzień 8)

- [ ] Testy autoryzacji (próba dostępu do zasobów bez logowania)
- [ ] Testy weryfikacji własności (próba edycji zasobów innego użytkownika)
- [ ] Testy RLS (próba dostępu do danych innego użytkownika)
- [ ] Testy XSS injection
- [ ] Testy CSRF (jeśli dotyczy)
- [ ] Testy rate limiting
- [ ] Weryfikacja, że secrets nie są eksponowane

### Faza 8: Testy wydajnościowe (Tydzień 9)

- [ ] Lighthouse audit - strona główna
- [ ] Lighthouse audit - strona generowania
- [ ] Testy czasu odpowiedzi API endpoints
- [ ] Testy bulk operations (commit endpoint z dużą liczbą fiszek)

### Faza 9: Testy regresyjne i finalizacja (Tydzień 10)

- [ ] Uruchomienie pełnego pakietu testów regresyjnych
- [ ] Naprawa wykrytych błędów
- [ ] Weryfikacja code coverage (minimum 80%)
- [ ] Dokumentacja wyników testów
- [ ] Przygotowanie raportu końcowego

### Faza 10: Ciągłe testowanie (po wdrożeniu)

- [ ] Automatyczne uruchamianie testów w CI/CD przy każdym PR
- [ ] Cotygodniowe testy regresyjne
- [ ] Monitoring błędów w produkcji (Sentry/podobne)
- [ ] Aktualizacja testów przy dodawaniu nowych funkcji

## 8. Kryteria akceptacji testów

### 8.1. Kryteria ilościowe

- **Code coverage**: minimum 80% dla warstwy serwisów i schematów
- **Code coverage**: minimum 70% dla komponentów React
- **Testy jednostkowe**: minimum 3 testy na funkcję (happy path, edge case, error case)
- **Testy E2E**: minimum 1 test na kluczowy przepływ użytkownika
- **Pass rate**: 100% testów musi przechodzić przed wdrożeniem

### 8.2. Kryteria jakościowe

- **Testy są izolowane**: każdy test może być uruchomiony niezależnie
- **Testy są powtarzalne**: ten sam test zawsze daje ten sam wynik
- **Testy są szybkie**: testy jednostkowe < 100ms, integracyjne < 1s, E2E < 30s
- **Testy są czytelne**: nazwy testów opisują co jest testowane i jaki jest oczekiwany rezultat
- **Testy są maintainable**: łatwe do aktualizacji przy zmianie kodu

### 8.3. Kryteria funkcjonalne

- **Bezpieczeństwo**: wszystkie testy bezpieczeństwa przechodzą (zero exploitów)
- **Funkcjonalność**: wszystkie kluczowe funkcje działają zgodnie z wymaganiami
- **Stabilność**: brak błędów krytycznych i blokujących
- **Wydajność**: spełnienie wymagań wydajnościowych (Lighthouse > 90, API < 500ms)
- **Dostępność**: podstawowe wymogi a11y są spełnione (keyboard navigation, semantic HTML)

### 8.4. Kryteria gotowości do produkcji

- [ ] Wszystkie testy jednostkowe przechodzą (100%)
- [ ] Wszystkie testy integracyjne przechodzą (100%)
- [ ] Wszystkie testy E2E przechodzą (100%)
- [ ] Wszystkie testy bezpieczeństwa przechodzą (100%)
- [ ] Code coverage >= 80% dla serwisów
- [ ] Code coverage >= 70% dla komponentów
- [ ] Lighthouse Performance score >= 90
- [ ] Brak błędów krytycznych i blokujących
- [ ] CI/CD pipeline działa poprawnie
- [ ] Dokumentacja testów jest kompletna

## 9. Role i odpowiedzialności w procesie testowania

### 9.1. QA Engineer (Lead)

**Odpowiedzialności**:

- Tworzenie i utrzymywanie strategii testowania
- Projektowanie scenariuszy testowych
- Pisanie testów E2E (Playwright)
- Nadzór nad jakością testów
- Raportowanie wyników testów
- Zarządzanie środowiskiem testowym
- Review testów pisanych przez developerów

**Osoba**: [Do przypisania]

### 9.2. Frontend Developer

**Odpowiedzialności**:

- Pisanie testów jednostkowych dla komponentów React
- Pisanie testów dla hooków (useGenerateFlow)
- Pisanie testów dla schematów walidacji (Zod)
- Naprawa błędów wykrytych w testach frontend
- Code review testów frontend

**Osoba**: [Do przypisania]

### 9.3. Backend Developer

**Odpowiedzialności**:

- Pisanie testów jednostkowych dla serwisów
- Pisanie testów integracyjnych dla API endpoints
- Pisanie testów dla middleware
- Mockowanie zewnętrznych serwisów (OpenRouter)
- Naprawa błędów wykrytych w testach backend
- Code review testów backend

**Osoba**: [Do przypisania]

### 9.4. DevOps Engineer

**Odpowiedzialności**:

- Konfiguracja CI/CD pipeline (Github Actions)
- Setup środowiska testowego (staging)
- Konfiguracja Supabase Local w CI/CD
- Monitorowanie testów w pipeline
- Zarządzanie secrets i zmiennymi środowiskowymi
- Setup Lighthouse CI

**Osoba**: [Do przypisania]

### 9.5. Product Owner

**Odpowiedzialności**:

- Definiowanie kryteriów akceptacji
- Priorytetyzacja testów (co jest najważniejsze)
- Akceptacja wyników testów
- Decyzje o gotowości do wdrożenia

**Osoba**: [Do przypisania]

### 9.6. Security Specialist (opcjonalnie)

**Odpowiedzialności**:

- Przeprowadzenie testów bezpieczeństwa
- Audyt RLS i autoryzacji
- Testy penetracyjne (opcjonalnie)
- Rekomendacje dotyczące bezpieczeństwa

**Osoba**: [Do przypisania lub zewnętrzny konsultant]

## 10. Procedury raportowania błędów

### 10.1. Narzędzie do śledzenia błędów

**Github Issues** - wszystkie błędy są raportowane jako Issues w repozytorium

**Labele**:

- `bug` - błąd funkcjonalny
- `security` - błąd bezpieczeństwa
- `performance` - problem wydajnościowy
- `a11y` - problem z dostępnością
- `critical` - błąd krytyczny (blokuje funkcjonalność)
- `high` - błąd o wysokim priorytecie
- `medium` - błąd o średnim priorytecie
- `low` - błąd o niskim priorytecie
- `test-failure` - test nie przechodzi

### 10.2. Szablon raportu błędu

```markdown
## Opis błędu

[Krótki opis problemu]

## Środowisko

- **Typ testu**: [Jednostkowy / Integracyjny / E2E]
- **Środowisko**: [Local / Staging / CI/CD]
- **Przeglądarka** (dla E2E): [Chrome 120 / Firefox 121 / Safari 17]
- **System operacyjny**: [Windows 11 / macOS 14 / Linux]

## Kroki do reprodukcji

1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## Oczekiwany rezultat

[Co powinno się stać]

## Rzeczywisty rezultat

[Co się faktycznie stało]

## Logi/Screenshot

[Załączenie logów lub screenshotów]

## Priorytet

[Critical / High / Medium / Low]

## Dodatkowe informacje

[Wszelkie inne istotne informacje]
```

### 10.3. Proces obsługi błędów

#### Krok 1: Wykrycie błędu

- Test nie przechodzi w lokalnym środowisku, staging lub CI/CD
- QA lub developer wykrywa błąd manualnie

#### Krok 2: Raportowanie

- Utworzenie Github Issue według szablonu
- Przypisanie odpowiednich labeli (bug, priorytet)
- Przypisanie do odpowiedniej osoby (jeśli wiadomo kto powinien naprawić)
- Dodanie do Project Board (opcjonalnie)

#### Krok 3: Triaging

- Product Owner / Tech Lead przegląda błędy
- Weryfikacja priorytetu
- Decyzja czy blokuje wdrożenie (critical)
- Przypisanie do sprintu (jeśli stosujemy Scrum)

#### Krok 4: Naprawa

- Developer przejmuje Issue
- Tworzy branch: `fix/issue-123-short-description`
- Naprawia błąd
- Dodaje test regresyjny (jeśli nie istnieje)
- Tworzy Pull Request z referencją do Issue (#123)

#### Krok 5: Weryfikacja

- Code review przez innego developera
- Testy automatyczne w CI/CD muszą przejść
- QA weryfikuje naprawę (jeśli to możliwe)
- Merge do main/develop

#### Krok 6: Zamknięcie

- Issue zostaje zamknięty automatycznie (jeśli PR zawiera "Fixes #123")
- Weryfikacja w środowisku staging
- Uwzględnienie w release notes

### 10.4. Eskalacja błędów krytycznych

**Błąd krytyczny** = blokuje kluczową funkcjonalność lub stanowi zagrożenie bezpieczeństwa

**Procedura**:

1. **Natychmiastowe powiadomienie**: Slack/Discord/Email do całego zespołu
2. **Oznaczenie**: Label `critical` + `security` (jeśli dotyczy)
3. **Priorytet 0**: Przerywamy bieżące prace, skupiamy się na naprawie
4. **War room** (jeśli potrzebne): Spotkanie synchroniczne zespołu
5. **Hotfix**: Jeśli błąd jest na produkcji, tworzymy hotfix branch
6. **Post-mortem**: Po naprawie - analiza przyczyn i działania zapobiegawcze

### 10.5. Metryki błędów

**Śledzenie**:

- Liczba błędów wykrytych (per tydzień/sprint)
- Liczba błędów naprawionych (per tydzień/sprint)
- Średni czas naprawy (Time to Resolution)
- Liczba błędów krytycznych
- Liczba błędów wykrytych w produkcji (ideał: 0)

**Raportowanie**:

- Cotygodniowy raport dla zespołu
- Comiesięczny raport dla stakeholderów

---

## Podsumowanie

Ten plan testów zapewnia kompleksowe pokrycie projektu SmartFlash na wszystkich poziomach - od testów jednostkowych po testy E2E i bezpieczeństwa. Kluczowe obszary priorytetowe to:

1. **Uwierzytelnianie i autoryzacja** - fundament bezpieczeństwa aplikacji
2. **Generowanie fiszek** - główna funkcjonalność aplikacji
3. **Integracja z OpenRouter.ai** - krytyczny punkt potencjalnych awarii
4. **RLS i weryfikacja własności** - zapobieganie wyciekom danych

Harmonogram testów jest rozłożony na 10 tygodni, co pozwala na systematyczne pokrycie wszystkich obszarów bez pośpiechu. Kluczowe jest również ustanowienie ciągłego testowania w CI/CD, aby każda zmiana była automatycznie weryfikowana.

Sukces planu testów zależy od zaangażowania całego zespołu i konsekwentnego stosowania się do ustalonych procedur i kryteriów akceptacji.
