# Plan implementacji widoku Generowanie (Generate)

## 1. Przegląd
Widok `Generate` (/generate) umożliwia wklejenie długiego tekstu źródłowego (1000–10000 znaków), uruchomienie procesu generowania kandydatów na fiszki przez AI, przegląd wygenerowanych kandydatów z możliwością akceptacji/edycji/odrzucenia oraz zapis zaakceptowanych fiszek zbiorczo. Widok obsługuje zarówno synchroniczny (200) jak i asynchroniczny (202 + polling) flow generacji, pokazuje status i umożliwia anulowanie operacji.

## 2. Routing widoku
- Główna ścieżka: `/generate`
- Alternatywny dostęp do konkretnej generacji (review): `/generate/:generationId/review`
- Trasa chroniona: wymaga zalogowania (auth guard, redirect do `/auth/login?returnTo=/generate`)

## 3. Struktura komponentów
Hierarchia (top-down):
- GeneratePage (strona)  
  - GenerateTopbarAction (CTA w topbar — już istnieje globalnie)  
  - GenerateFormPanel  
    - TextAreaCounter  
    - GenerateButton  
    - RateLimitTooltip / CooldownBadge  
  - GenerationStatusPanel (spinner, cancel, last-updated, toast bridge)  
  - CandidatesSection (renderowane po otrzymaniu kandydatów)  
    - CandidatesList  
      - CandidateCard (per-card controls: Accept / Edit / Reject)  
    - CommitBar (bulk commit button, accepted count)  
  - EditCandidateModal (front/back fields, validation)  
  - CommitResultModal (summary: saved/skipped + reasons)

## 4. Szczegóły komponentów
### GeneratePage
- Opis: kontener strony, łączy API hooks, zarządza głównymi stanami (generationId, candidates, accepted list).
- Główne elementy: `section` z GenerateFormPanel, GenerationStatusPanel, CandidatesSection.
- Zdarzenia: inicjacja POST /api/generations, rozpoczęcie pollingu, cancel, commit.
- Walidacja: ogólne warunki przed wysłaniem (source_text.length ∈ [1000,10000]).
- Typy: CreateGenerationCommand, CreateGenerationResponseSync | Async, GenerationDTO.
- Propsy: brak (route page).

### TextAreaCounter
- Opis: textarea z licznikiem znaków, enforce max 10000, aria-live dla czytników.
- Elementy: `<textarea>`, counter, inline error message element.
- Zdarzenia: onChange, onPaste, onFocus.
- Walidacja: blokowanie wprowadzania >10000, minimalne info przed POST (>=1000).
- Typy: local string state.
- Propsy: value, onChange, maxLength (10000), minLength (1000).

### GenerateButton
- Opis: primary CTA; disabled gdy w cooldown/rate-limited, lub walidacja nieprzechodzi.
- Elementy: button z spinnerem gdy request trwający.
- Zdarzenia: onClick -> wywołuje startGeneration.
- Walidacja: disabled jeśli source_text.length < 1000 lub >10000 lub jeśli pending.
- Typy: none special.
- Propsy: disabled, onClick, isLoading.

### GenerationStatusPanel
- Opis: pokazuje stan generowania (pending/progress/success/failure), cancel, time elapsed, toast integration.
- Elementy: spinner/progress, cancel button, last-updated timestamp.
- Zdarzenia: onCancel -> wysyła request cancela (implementacja: abort signal / API cancel if available).
- Walidacja: n/a.
- Typy: GenerationDTO (metadata), status enum.
- Propsy: status, generationId, onCancel.

### CandidatesList
- Opis: lista CandidateCard; renderowana gdy candidates dostępne.
- Elementy: list (ul/ol) z CandidateCard.
- Zdarzenia: propaguje accept/edit/reject z kart.
- Walidacja: n/a (per-card validated on commit).
- Typy: GenerationCandidate[], local per-card status map.
- Propsy: candidates, onAccept, onEdit, onReject.

### CandidateCard
- Opis: pojedyncza propozycja fiszki, pokazywana front/back (preview), score, akcje Accept/Edit/Reject.
- Elementy: front preview, back preview (expandable), score badge, buttons Accept/Edit/Reject.
- Zdarzenia: onAccept, onEdit (opens modal), onReject (removes from list or sets status rejected).
- Walidacja: front/back length enforced in Edit modal; duplicate_front hint mapping from API on commit.
- Typy: GenerationCandidate + local status ('pending'|'accepted'|'edited'|'rejected').
- Propsy: candidate, onAccept, onEdit, onReject.

### EditCandidateModal
- Opis: modal do edycji front/back; trap focus; walidacja front ≤200, back ≤500.
- Elementy: two inputs (front, back), save/cancel buttons, inline validation messages.
- Zdarzenia: onSave -> aktualizuje local candidate, onCancel.
- Walidacja: client-side length checks, non-empty; mapowanie serwerowych error codes (duplicate_front → field hint).
- Typy: EditedCandidateViewModel { candidate_id, front, back, source }.
- Propsy: initialCandidate, onSave, onClose.

### CommitBar
- Opis: pasek u dołu listy pokazujący liczbę zaakceptowanych i CTA „Zapisz zaakceptowane”.
- Elementy: accepted count, SaveButton, optional select-all.
- Zdarzenia: onCommit -> POST /api/generations/{id}/commit lub /api/flashcards/bulk.
- Walidacja: require at least 1 accepted; disable gdy in flight.
- Typy: CommitGenerationCommand, BulkSaveResult.
- Propsy: acceptedCount, onCommit, isLoading.

### CommitResultModal
- Opis: pokazuje wynik operacji zapisu: saved/skipped z powodami (np. duplicate_front).
- Elementy: two lists (saved, skipped) z per-item reason, buttons Close / Retry failed.
- Zdarzenia: onRetry, onClose.
- Walidacja: n/a.
- Typy: BulkSaveResult.
- Propsy: result, onRetry.

## 5. Typy
- Użyć istniejących DTO z `src/types.ts`:
  - CreateGenerationCommand { source_text, model?, max_candidates?, timeout_seconds? }
  - CreateGenerationResponseSync / Async
  - GenerationDTO & GenerationCandidate
  - CommitGenerationCommand, CommitAcceptedCandidate
  - BulkCreateFlashcardsCommand, BulkSaveResult

Dodatkowe ViewModel / lokalne typy do dodań:
- EditedCandidateViewModel:
  - candidate_id: string
  - front: string
  - back: string
  - source: "ai-full" | "ai-edited"
  - status: "accepted"|"edited"|"rejected"|"pending"

- GenerateViewState:
  - source_text: string
  - generationId?: string
  - status: "idle"|"pending"|"success"|"failed"
  - candidates: EditedCandidateViewModel[]
  - acceptedCount: number
  - cooldownUntil?: number (timestamp)
  - error?: ApiError

## 6. Zarządzanie stanem
- Lokalny stan strony + TanStack Query do komunikacji i pollingu:
  - useGenerateMutation (POST /api/generations) — opcje: retry=0 (mutacja), timeout sterowany przez API, onSuccess rozdziela sync/async flows.
  - useGenerationQuery(generationId) (GET /api/generations/{id}) — polling z exponential backoff (useInfinite / query with enabled flag) do momentu wygenerowania candidates.
  - useBulkSaveMutation (POST /api/generations/{id}/commit or /api/flashcards/bulk) — obsługa per-card results.

- Proponowany custom hook: useGenerateFlow
  - Zadania hooka:
    - expose: source_text, setSourceText, startGeneration, cancelGeneration, candidates, accept/edit/reject handlers, commitAccepted
    - integruje TanStack Query (mutation + query polling), zarządza cooldown timerem, maps API errors to per-field hints
  - Korzyści: enkapsulacja logiki pollingu, retry/backoff, cancel, cooldown, i side-effects (toasts, cache invalidation).

## 7. Wywołania API i akcje frontendowe
- POST /api/generations — payload CreateGenerationCommand. Frontend:
  - Validate source_text length (1000–10000) before call.
  - If 200 — otrzymać candidates → populate candidates list.
  - If 202 — otrzymać generation_id → uruchomić polling GET /api/generations/{id}.
  - Handle 400 (show inline validation), 503 (show retry modal/toast), 429 (rate limit -> start cooldown UI).

- GET /api/generations/{id} — polling until candidates available. Frontend:
  - Exponential backoff via TanStack Query callbacks; show progress UI; allow cancel (abort polling).

- POST /api/generations/{id}/commit lub POST /api/flashcards/bulk — commit accepted cards:
  - Build CommitGenerationCommand from accepted candidates (source mapping: ai-full | ai-edited depending on edits).
  - On success: show CommitResultModal, invalidate `/api/flashcards` cache, optionally redirect.
  - On skipped results (duplicates) show inline hints and allow user to edit and retry.

## 8. Mapowanie historyjek użytkownika do implementacji
- US-001 Generowanie: TextAreaCounter + GenerateButton + POST /api/generations + polling
- US-002 Recenzja: CandidatesList + CandidateCard + EditCandidateModal + per-card actions
- US-003 Zapisanie zaakceptowanych: CommitBar + POST commit (bulk) + CommitResultModal + cache invalidation
- US-004 Ręczne dodawanie: poza zakresem tej strony, ale Edit modal i Flashcards API reuse
- US-015 Błędy generowania: GenerationStatusPanel + toasty + retry modal + hook retry/back-off
- US-016 Walidacja długości: TextAreaCounter + client-side enforcement przed POST

## 9. Interakcje użytkownika i oczekiwane wyniki
- Wklejenie tekstu → liczy znaki, blokuje jeśli >10000, pokazuje ostrzeżenie jeśli <1000.
- Kliknij „Generuj” → przy spełnionych warunkach: button spinner, jeśli sync 200 -> lista kandydatów, jeśli 202 -> pending UI z pollingiem.
- W trakcie pending: opcja Anuluj → zatrzymuje polling i zapytanie background cancel (jeśli backend obsługuje) lub odrzuca lokalnie.
- Dla każdego kandydata: Accept (oznacza jako zaakceptowany), Edit (otwiera modal), Reject (usuwa/oznacza odrzucony). Accepted liczone w CommitBar.
- Kliknięcie „Zapisz zaakceptowane” → wysyła bulk commit; wynik pokazany w CommitResultModal; saved → invalidate cache; skipped → per-card inline reason z możliwością edycji i ponowienia.

## 10. Warunki i walidacja (komponenty)
- TextAreaCounter:
  - Enforce: length ≤ 10000 (prevent input) i warn if <1000 (prevent submit).
- EditCandidateModal:
  - front: required, 1–200 chars
  - back: required, 1–500 chars
- Commit:
  - Before sending, re-validate each accepted card; remove any that fail client validation and present errors to użytkownika.
- API error mapping:
  - 400 → show field-level hints
  - 409 / duplicate_front → mark card as skipped with reason, show inline edit suggestion
  - 429 → initiate client cooldown timer and block GenerateButton
  - 503 → show retry modal/toast with guidance

## 11. Scenariusze błędów i obsługa
- Network failure during POST generation:
  - Retry strategy: show toast „Błąd sieci” + allow Retry; do not lose source_text.
- Generation 202 never completes (worker down):
  - Show persistent pending panel z opcją „Wyślij ponownie” i „Zgłoś problem”; allow user to cancel.
- Partial failures on bulk save:
  - Show CommitResultModal with saved/skipped; do not remove locally saved items until success confirmed; allow edit+retry for skipped.
- Duplicate front on commit:
  - Map 409 -> per-card duplicate hint, present Edit action pre-filled; optionally remove duplicate from commit.
- Unauthorized (401/403):
  - Global handler -> redirect to /auth/login?returnTo=/generate; show toast; preserve source_text in local state.
- Rate limit (429):
  - Show cooldown UI, disable GenerateButton until cooldownEnds.

## 12. Potencjalne wyzwania implementacyjne i rozwiązania
- Polling + exponential backoff complexity:
  - Rozwiązanie: użyć TanStack Query `refetchInterval` z dynamicznym backoff albo custom retry logic w useGenerationQuery; enkapsulować w `useGenerateFlow`.
- Anulowanie generowania:
  - Jeśli backend nie expose cancel endpoint, stop polling i informuj użytkownika, backend worker może dalej działać; pokaż opcję „Poinformuj po zakończeniu”.
- Per-card duplicate handling przy bulk commit:
  - Nie usuwać zatwierdzonych lokalnie zanim backend potwierdzi; pokaz wynik i daj mechanizm do edycji/skipping w UI.
- Cooldown / rate limits:
  - Centralny cooldown state w AuthContext/UIContext; synchronizacja z serwerem (header X-RateLimit-Reset) jeśli dostępne.
- Accessibility:
  - Modale trap focus, aria-live for counters/status, keyboard shortcuts for accept/reject (a/d keys).
- Utrzymanie stanu przy redirect/refresh:
  - Optional: serializować tymczasowy generation state do sessionStorage by restoring on reload for generationId in URL.

## 13. Kroki implementacji (szczegółowe)
1. Utworzyć strukturę pliku strony: `src/pages/generate.astro` lub React route wrapper; przygotować route guard (auth).
2. Zaimplementować `TextAreaCounter` komponent (max enforcement, aria-live).
3. Napisać custom hook `useGenerateFlow` z TanStack Query mutations i polling logic.
4. Zaimplementować `GenerationStatusPanel` z cancel i spinnerem.
5. Zaimplementować `CandidatesList` i `CandidateCard` (Accept/Edit/Reject).
6. Zaimplementować `EditCandidateModal` z walidacją front/back limits.
7. Zaimplementować `CommitBar` i hook do `commitAccepted` (POST commit or POST /api/flashcards/bulk).
8. Obsługa API error mapping (duplicate_front, 429, 503) i UI toasts/modals.
9. Integracja z cache invalidation TanStack Query dla `/api/flashcards`.
10. Dodać tests: unit dla hooka useGenerateFlow, e2e dla flow generate→review→commit.
11. Dodać a11y checks i keyboard shortcuts.

--- 

Dokumentacja implementacji przygotowana. Następny krok: utworzyć finalny plik planu (ten plik).
