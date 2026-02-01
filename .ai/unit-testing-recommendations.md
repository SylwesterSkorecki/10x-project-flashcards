# Rekomendacje testów jednostkowych

Proponowana nazwa pliku: `unit-testing-recommendations.md`

Data: 2026-02-01

## Struktura komponentów (ASCII)

src/components
├─ ui
│ ├─ button.tsx
│ ├─ input.tsx
│ ├─ label.tsx
│ ├─ textarea.tsx
│ ├─ dialog.tsx ──> imports: ui/button
│ └─ sonner.tsx
├─ auth
│ ├─ ForgotPasswordForm.tsx ──> imports: ui/button, ui/input, ui/label
│ ├─ LoginForm.tsx ──> imports: ui/button, ui/input, ui/label
│ ├─ RegisterForm.tsx ──> imports: ui/button, ui/input, ui/label
│ └─ ResetPasswordForm.tsx ──> imports: ui/button, ui/input, ui/label
├─ generate
│ ├─ GeneratePage.tsx ──> imports: generate/GenerateFormPanel, GenerationStatusPanel, CandidatesList, EditCandidateModal, CommitResultModal, ui/sonner, ui/button, hooks/useGenerateFlow
│ ├─ GenerateFormPanel.tsx ──> imports: TextAreaCounter, GenerateButton
│ ├─ TextAreaCounter.tsx
│ ├─ GenerateButton.tsx ──> imports: ui/button
│ ├─ GenerationStatusPanel.tsx ──> imports: ui/button
│ ├─ CandidatesList.tsx ──> imports: CandidateCard
│ ├─ CandidateCard.tsx ──> imports: ui/button
│ ├─ EditCandidateModal.tsx ──> imports: ui/dialog, ui/button, ui/label, ui/input, ui/textarea
│ └─ CommitResultModal.tsx ──> imports: ui/dialog, ui/button
├─ account
│ └─ AccountSettings.tsx ──> imports: ui/button, ui/input, ui/label, ui/dialog
├─ layout
│ └─ Navigation.tsx ──> imports: ui/button
└─ **tests**
└─ components/Button.test.tsx ──> imports: ui/button

## Podsumowanie — co warto przetestować i dlaczego

Krótko — skup się najpierw na modułach z logiką (czyste funkcje / hooki / komponenty z warunkami), a dopiero potem na prostych wrapperach UI. Poniżej lista proponowanych miejsc testowych wraz z celami:

- GenerationsService (szczególnie `_parseGenerationResponse`, `_convertToGenerationCandidates`, `estimateGenerationCost`, walidacje w `generateFlashcards`)
  - Dlaczego: krytyczna logika konwersji/parsowania AI i obsługi błędów.
  - Assercje: mapowanie pól (question->front/answer->back), domyślne score, sortowanie i limitowanie kandydatów, rzucanie zrozumiałych błędów na nieprawidłowy input.

- useGenerateFlow (hook)
  - Dlaczego: to „state machine” generowania (start, polling, success, cancel, accept/edit/reject candidates) — dużo stanów i side‑effectów.
  - Assercje: przejścia stanów, obsługa cancel, poprawna aktualizacja listy candidates i acceptedCount; mockować sieć / timer.

- TextAreaCounter
  - Dlaczego: walidacja długości, logika paste (truncate), kolory/statusy; istotne dla UX i blokowania złych żądań.
  - Assercje: ograniczenie maxLength przy wpisie i wklejaniu, komunikaty o błędach, klasy/kolor countera dla krótkiego/długiego/prawidłowego tekstu.

- GenerationStatusPanel
  - Dlaczego: renderuje różne widoki dla statusów (pending/polling/success/failed/cancelled) oraz pasek postępu i timer — logika warunkowa.
  - Assercje: właściwe ikony/teksty dla każdego statusu, widoczność przycisku Cancel, format czasu, width paska dla polling.

- CandidateCard
  - Dlaczego: logika akceptowania/odrzucania, rozwijania odpowiedzi, kolorowanie ocen — kluczowe UX zachowania.
  - Assercje: toggle accept/unaccept wywołuje callbacki, expand/collapse zmienia widok, kolor/badge zależne od score i statusu edited.

- EditCandidateModal
  - Dlaczego: walidacja pól, zachowanie na skróty (Cmd/Ctrl+Enter), reset stanu przy close.
  - Assercje: walidacja długości/empty, wywołanie `onSave` tylko gdy pola są poprawne, zamknięcie resetuje stan.

- CommitResultModal & CandidatesList
  - Dlaczego: warunkowe renderowanie saved vs skipped; sprawdzanie poprawności wyświetlania różnych scenariuszy wyników.
  - Assercje: pokazuje odpowiednie sekcje i przyciski (Review Skipped), teksty i liczniki.

- GenerateFormPanel / GenerateButton
  - Dlaczego: enable/disable logika zależna od długości tekstu i stanu isLoading — zapobiega złym wywołaniom.
  - Assercje: przycisk zablokowany gdy tekst za krótki/za długi/lub isLoading.

- Walidacje schematów (auth.schema) i mapowanie błędów w formularzach (Register/Login/Reset/Forgot)
  - Dlaczego: reguły bezpieczeństwa i UX; testy schematów i parsowania błędów zapobiegają regresjom.
  - Assercje: schematy akceptują/odrzucają oczekiwane wartości; komponenty ustawiają odpowiednie komunikaty błędów.

- Małe narzędzia/pomocniki (np. `hashSourceText`, `cn`)
  - Dlaczego: proste, szybkie testy, niskie koszty, duża wartość zabezpieczenia.

## Priorytety

- Wysoki: GenerationsService + useGenerateFlow (najwięcej logiki i ryzyko)
- Średni: TextAreaCounter, GenerationStatusPanel, CandidateCard, EditCandidateModal
- Niski: CommitResultModal, CandidatesList, GenerateFormPanel, GenerateButton, proste UI wrappers

## Dalsze kroki

- Jeśli chcesz, mogę wygenerować przykładowy test (Vitest + Testing Library) dla jednego z powyższych komponentów/hooków. Który wybierasz?
