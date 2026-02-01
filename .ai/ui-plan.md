# Architektura UI dla SmartFlash

## 1. Przegląd struktury UI

SmartFlash to webowy interfejs (Astro + React) z responsywnym topbarem (shadcn/ui) i klient‑side routingiem. UI obsługuje CRUD fiszek, asynchroniczne/synchroniczne generowanie AI z przeglądem kandydatów, sesje nauki (spaced repetition) oraz widok statystyk. Stan globalny: React Context (auth, UI flags, modal manager), TanStack Query dla fetch/cache/polling/retries i optimistic updates. Wszystkie operacje API wymagają autoryzacji (JWT/Supabase).

Kluczowe zasady:

- Mobile‑first, WCAG AA (focus management, aria, keyboard)
- Bezpieczeństwo: nie ujawniać danych innych użytkowników, obsługa 401/403, re‑auth przy operacjach krytycznych
- Dobre UX dla generowania AI: widoczny status, polling z exponential backoff, możliwość anulowania, jasne raporty saved/skipped

## 2. Lista widoków

Poniżej każdy widok z celem, kluczowymi informacjami i komponentami.

- Ekran uwierzytelniania:
  - Ścieżka: `/logi` i `/register`
  - Główny cel: Umożliwienie użytkownikowi logowania i rejestracji
  - Kluczowe informacje: Formularze z polami e-mail i hasło; wiadomości o błędach uwierzytelniania
  - Kluczowe komponenty: Formularz logowania/rejestracji, komponent walidacji, przyciski, komunikaty błędów
    UX, dostępność i względy bezpieczeństwa: Prosty formularz, czytelne komunikaty błędów, obsługa klawiatury, zabezpieczenia JWT

- Nazwa widoku: Lista fiszek
  - Ścieżka: `/flashcards`
  - Główny cel: Przegląd i zarządzanie zapisanymi fiszkami (search, sort, pagination)
  - Kluczowe informacje:
    - Lista (tabela/siatka) z `front`, `back`, `source`, `created_at`
    - Paginacja (page, per_page=20), total
    - Filtr (q), sort_by, sort_order w URL
  - Kluczowe komponenty:
    - SearchBar z debounced input (300–500ms) i aria-label
    - FlashcardsTable / CardGrid z responsywnymi kolumnami
    - Pagination controls (semantic buttons, keyboard focus)
    - Row actions: Edit (modal), Delete (confirm dialog), Quick preview
    - Bulk actions (select multiple) — opcjonalnie
  - UX / dostępność / bezpieczeństwo:
    - Keyboard navigation dla listy i akcji, aria‑labels dla przycisków
    - Confirm dialog dla delete z re‑auth jeśli wymagane
    - Nie pokazywać akcji edycji/usuwania jeśli zasób nie należy do użytkownika

- Nazwa widoku: Generowanie (Generate)
  - Ścieżka: `/generate`
  - Główny cel: Pozwolić użytkownikowi wkleić źródłowy tekst i uruchomić generowanie kandydatów AI
  - Kluczowe informacje:
    - Pole `source_text` z licznikiem znaków (0–10000) i walidacją
    - Primary action „Generuj” (górny topbar + lokalny)
    - Stan generowania: synchronous result (200) lub pending (202) z pollingiem
    - Lista kandydatów po stronie wyników z per‑card controls
  - Kluczowe komponenty:
    - TextArea z live counter, max enforcement i accessible error messages
    - GenerateButton z disabled przy throttle/cooldown i tooltip tłumaczący limit
    - GenerationStatusPanel: spinner/progress, toast/errors, cancel button
    - CandidatesList: CandidateCard z Accept / Edit / Reject
    - CommitBar: licznik zaakceptowanych, przycisk Zapisz (bulk commit)
  - UX / dostępność / bezpieczeństwo:
    - Polling z exponential backoff (TanStack Query) i widoczny status (pending/failed/success)
    - Anulowanie: wyraźny CTA pozwalający przerwać generowanie
    - Walidacja długości przed POST; komunikaty inline mapujące API error codes (duplicate_front → field hint)
    - Rate‑limit UI: cooldown timer i blokada przy przekroczeniu

- Nazwa widoku: Review kandydatów (część Generate)
  - Ścieżka: `/generate/:generationId/review` (lub modal/sekcja)
  - Główny cel: Recenzja, edycja i selekcja kandydatów przed zapisem
  - Kluczowe informacje:
    - Lista kandydatów z identyfikatorami i score
    - Per‑card status (accepted/edited/rejected)
    - Informacje o generacji: model, czas, generated_count
  - Kluczowe komponenty:
    - CandidateCard z akcjami Accept/Edit/Reject i inline reason when skipped
    - Edit modal (trap focus, autofocus, front ≤200, back ≤500, inline validation)
    - Commit summary modal/result with per‑card saved/skipped and reasons
  - UX / dostępność / bezpieczeństwo:
    - Ensure modals trap focus, ESC closes, aria-labelledby/aria-describedby
    - Mapowanie błędów serwera do per‑field hints

- Nazwa widoku: Sesja nauki (Study)
  - Ścieżka: `/study`
  - Główny cel: Prowadzenie użytkownika przez sesję spaced repetition
  - Kluczowe informacje:
    - Kolejka fiszek od algorytmu (frontend fetchuje sesję/queue)
    - Aktualna karta: front → reveal → back → rating (np. Easy/Good/Hard)
    - Progres sesji, ilość pozostałych kart
  - Kluczowe komponenty:
    - StudyCard (focusable, keyboard controls: space to reveal, 1–5 keys to rate)
    - SessionControls: next, previous, end session, progress bar
    - Accessibility: large readable fonts, high contrast, aria-live for new card
  - UX / dostępność / bezpieczeństwo:
    - Keyboard-first interactions, screen reader friendly announcements
    - Local confirmation before leaving session (unsaved progress)

- Nazwa widoku: Statystyki (Stats)
  - Ścieżka: `/stats`
  - Główny cel: Przegląd metryk generowania i akceptacji
  - Kluczowe informacje:
    - acceptance_rate, total_generations, total_generated_cards, accepted_unedited/edited
    - Filtry dat (from/to)
    - Prost e wykresy i eksport CSV (opcjonalnie)
  - Kluczowe komponenty:
    - StatsSummary cards, TimeRangePicker, Charts (accessible with text summaries)
    - Export button (CSV) z potwierdzeniem i ograniczeniami bezpieczeństwa
  - UX / dostępność / bezpieczeństwo:
    - Tekstowe podsumowanie danych dla screen readerów
    - Ograniczenia eksportu i kontrola dostępu

- Nazwa widoku: Konto / Profile / Auth flows
  - Ścieżki: `/account`, `/auth/login`, `/auth/signup`, `/auth/reset`, `/auth/verify`
  - Główny cel: Zarządzanie kontem, rejestracja, logowanie, weryfikacja, usunięcie konta
  - Kluczowe informacje:
    - Formularze z walidacją (email format, password length ≥10)
    - Status email verified, re‑auth dla delete
    - Bezpieczne flows: logout, token refresh handling
  - Kluczowe komponenty:
    - AuthForm components, Reauth modal for sensitive actions, Toasts for errors
  - UX / dostępność / bezpieczeństwo:
    - Ensure password inputs use appropriate autocomplete, no token leakage to logs, intercept 401 -> redirect to login/refresh

- Nazwa widoku: Settings / Notifications (opcjonalne)
  - Ścieżka: `/settings`
  - Główny cel: Cooldown/rate limit info, notification preferences (polling vs future push)
  - Kluczowe informacje:
    - Current cooldown, API usage counters
  - Kluczowe komponenty:
    - Toggle controls, explanatory tooltips

## 3. Mapa podróży użytkownika

Główny przypadek użycia: Generowanie i zapis fiszek

Kroki:

1. Użytkownik loguje się (/auth/login) — po sukcesie redirect → /dashboard
2. Użytkownik wybiera „Generuj” w topbar lub przechodzi na `/generate`
3. Wkleja `source_text`, widzi licznik znaków; kiedy gotowy klika „Generuj”
4. UI wysyła POST /api/generations
   - Jeśli 200: otrzymuje candidates → przechodzi do Review (ta sama strona sekcja)
   - Jeśli 202: UI pokazuje pending state z generation_id i rozpoczyna polling GET /api/generations/{id} z exponential backoff; użytkownik widzi spinner i może anulować
5. Po dostępności kandydatów: CandidatesList renderuje CandidateCard dla każdego
6. Użytkownik akceptuje/edytuje/odrzuca kandydaty; edycja otwiera modal
7. Po selekcji klika „Zapisz zaakceptowane” → POST /api/generations/{id}/commit (lub /api/flashcards/bulk)
8. Otrzymuje raport saved/skipped; cache TanStack Query invaliduje `/api/flashcards` i redirect (opcjonalnie) do /dashboard lub zostaje na review z potwierdzeniem
9. Użytkownik może rozpocząć sesję nauki z zapisanych fiszek (/study)

Inne podróże:

- CRUD bez generowania: Flashcards → Edit modal → PUT /api/flashcards/{id}
- Usuwanie: Flashcards → Delete confirmation → DELETE /api/flashcards/{id}
- Auth flows: signup → email verification → login

## 4. Układ i struktura nawigacji

Zasady:

- Topbar (shadcn/ui Navigation menu) jako globalny element z primary action „Generuj” widocznym i zawsze dostępnym.
- Desktop: horizontal topbar z logo (lewo), nav links (Flashcards, Generate, Study, Stats, Account), primary CTA „Generuj” (prawo), user avatar menu (profile, logout).
- Mobile: hamburger menu, primary CTA jako przycisk w topbar lub sticky FAB; nav items w slide‑over panel.
- Breadcrumbs kontekstowe wewnątrz Generate/Review dla wygody nawigacji.
- Stan filtrów/paginacji/search w URL, umożliwiający deeplinkowanie i back/forward.

Mapowanie elementów do routingu:

- `/` → redirect → `/flashcards`
- `/flashcards` → lista fiszek
- `/generate` → generator + review
- `/generate/:id/review` → bezpośredni dostęp do generacji (polling / snapshot)
- `/study` → sesja nauki
- `/stats` → metryki
- `/account` → ustawienia konta

Bezpieczeństwo nawigacji:

- Chronione trasy → wymagają auth; guardy routingowe redirect do /auth/login z returnTo
- Przy wrażliwych akcjach (delete account) pop‑up re‑auth

## 5. Kluczowe komponenty

Lista komponentów wielokrotnego użytku i ich rola:

- Topbar / Navigation
  - logo, nav links, primary CTA, user menu
  - Accessibility: aria-haspopup, keyboard focus management

- Modal (shadcn modal wrapper)
  - trap focus, ESC to close, autofocus on first field, accessible labels

- TextAreaCounter
  - live character count, aria‑live updates, max enforcement

- CandidateCard
  - shows front/back preview, score, Accept/Edit/Reject buttons, lightweight inline validation UI

- FlashcardsTable / CardGrid
  - responsive rows/cards, row actions, accessible labels

- PaginationControls
  - semantic buttons, page links reflect in URL, keyboard operable

- GenerationStatusPanel
  - spinner, progress, cancel, last updated time, toast integration

- Toast / GlobalErrorHandler
  - central mapping of API errors to UX messages; toasty dla globalnych błędów; inline errors for validation

- API layer + hooks
  - TanStack Query hooks (useFlashcards, useGenerate, useGeneration, useCommit) z retry/polling/backoff config

- AuthContext / UIContext
  - manages auth state, re‑auth prompts, global modals, cooldown state

- StudyCard & SessionManager
  - handles per‑card reveal, key bindings, progress persistence

Dodatkowe uwagi UX / accessibility / security:

- Wszystkie akcje mutujące (DELETE, PUT, POST commit) powinny mieć optimistic UI lub potwierdzenia i obsługę rollback w przypadku błędu.
- Mapowanie kodów błędów API do UI (duplicate_front → per‑field hint; 503 → retry modal).
- Implementować interceptory fetch/axios do automatycznej obsługi 401 (silent refresh lub redirect) i globalnego logowania błędów.
- Dane wrażliwe i tokeny: preferować httpOnly cookies jeśli backend wspiera; jeśli nie, użyć Secure storage i minimalizować czas życia tokenu.

## 6. Mapowanie historyjek użytkownika (PRD) do UI

- US-001 (Generowanie) → `/generate` + TextAreaCounter + GenerateButton + GenerationStatusPanel
- US-002 (Recenzja kandydatów) → CandidatesList + CandidateCard + Edit modal
- US-003 (Zapisanie zaakceptowanych) → CommitBar + POST /api/generations/{id}/commit + Commit summary
- US-004 (Ręczne dodawanie) → Flashcards -> Add modal (front/back) + validation
- US-005 (Przegląd listy) → Flashcards / FlashcardsTable
- US-006 (Wyszukiwanie/paginacja) → SearchBar (debounced) + PaginationControls w URL
- US-007 (Edycja) → Edit modal na Flashcards i w Review
- US-008 (Usuwanie) → Delete confirm dialog
- US-009–013 (Auth flows) → Auth pages + Account (re‑auth on delete)
- US-014 (Bezpieczny dostęp) → RLS + protected routes + UI guards
- US-015 (Błędy generowania) → GenerationStatusPanel + retry modal + toasty
- US-016 (Walidacja długości) → Client side validation + server error mapping
- US-017 (Sesja nauki) → `/study` + StudyCard + SessionManager

## 7. Potencjalne stany błędów i edge cases

- Generacja zwraca 202 i nigdy nie kończy (worker down): pokaż trwały pending z opcją resend + kontakt support + zapis logu; umożliwić anulowanie.
- Duplikaty podczas bulk commit: API zwraca skipped z reason „duplicate_front” → wyświetlić inline i pozwolić na edycję przed ponownym zapisem.
- Przekroczenie limitów (rate limit): zablokować akcję po stronie klienta z cooldown timerem i tooltipem o limitach; przy 429/429 mapować do użytkownika.
- Błędy autoryzacji (401/403): global handler redirect→/auth/login, zachowując returnTo; przy krytycznych operacjach wprowadzić re‑auth.
- Long source_text (>10000): prevent at input and show inline validation
- Partial failures w bulk save: pokazywać saved/skipped, szczegółowe powody; nie usuwać zaakceptowanych lokalnie dopóki backend nie potwierdzi
- Network flakiness podczas study session: lokalne zapisy postępu sesji i retry

## 8. Zgodność z planem API

- Wszystkie interakcje korzystają z zaplanowanych endpointów:
  - GET/POST/PUT/DELETE `/api/flashcards` → Flashcards CRUD
  - POST `/api/generations` + GET `/api/generations/{id}` → Generate + polling
  - POST `/api/generations/{id}/commit` lub `/api/flashcards/bulk` → Commit accepted
  - GET `/api/stats/generations` → Stats
  - Auth routes z Supabase → Auth flows
- TanStack Query dla fetch/polling/retries ułatwia implementację backoff/polling zgodnie z API Planem
- Client‑side validation mirrors server validation (front/back length, source_text length)

## 9. Punkty bólu użytkownika i rozwiązania UI

- Ból: Długi czas generowania → rozwiązanie: wyraźny pending UI, polling z backoff, cancel, możliwość powiadomienia po zakończeniu (toast/pull)
- Ból: Duplikaty → rozwiązanie: per‑card feedback przy commit, edycja przed zapisem, inline reason
- Ból: Zgubienie kontekstu → rozwiązanie: stan filtrów/paginacji w URL, breadcrumbs i jasne breadcrumbs w review
- Ból: Ograniczenia użycia (koszty/rate) → rozwiązanie: cooldown UI, informacja o limitach, disable CTA przy cooldown
- Ból: Accessibility (keyboard/screen reader) → rozwiązanie: keyboard-first controls, aria-live, trap focus w modalach

---

Dokument przygotowany jako plan architektury UI; plik ma służyć jako punkt odniesienia dla implementacji komponentów i routingu.
