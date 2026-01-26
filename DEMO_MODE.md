# 🎮 Demo Mode - Instrukcja Testowania

## ✅ Demo Mode jest aktywny!

Mock API endpoints zostały zaimplementowane, aby umożliwić pełne testowanie UI bez backendu.

## 🚀 Jak testować

### 1. Uruchom serwer deweloperski

```bash
npm run dev
```

### 2. Otwórz przeglądarkę

```
http://localhost:4321/generate
```

## 📋 Co możesz przetestować

### ✅ Pełny flow generowania

1. **Wklej tekst** (1,000 - 10,000 znaków)
   - Przykład: Wklej dowolny tekst, np. artykuł z Wikipedii
   - Zobaczysz licznik znaków i walidację

2. **Kliknij "Generate Flashcards"**
   - Pojawi się spinner (~500ms)
   - Toast notification: "Generated X flashcard candidates"
   - Panel statusu z czasem generowania

3. **Przeglądaj wygenerowane kandydaty**
   - Mock generuje 1 kandydata na każde 500 znaków (max 8)
   - Każdy kandydat ma front/back/score
   - Back jest zwinięty, kliknij "Expand" aby rozwinąć

### ✅ Akcje na kandydatach

#### Accept (✓)
- Kliknij zielony przycisk z checkmarkiem
- Karta zmieni kolor na zielony
- Pojawi się zielona kropka w lewym górnym rogu
- Licznik "X accepted" zaktualizuje się
- Commit Bar pojawi się na dole

#### Edit (✎)
- Kliknij przycisk z ołówkiem
- Otworzy się modal z formularzem
- Edytuj front (max 200 znaków) i back (max 500 znaków)
- Zobacz licznik pozostałych znaków
- Zapisz (kliknij "Save Changes" lub Cmd+Enter)
- Karta dostanie badge "Edited" i status "ai-edited"

#### Reject (✗)
- Kliknij czerwony przycisk z X
- Karta zniknie z listy

### ✅ Zapisywanie fiszek

1. **Zaakceptuj kilka kandydatów** (kliknij ✓)
2. **Commit Bar pojawi się na dole**
   - Pokazuje liczbę zaakceptowanych fiszek
3. **Kliknij "Save Accepted"**
   - Spinner (~800ms)
   - Toast notification z wynikiem
4. **CommitResultModal się otworzy**
   - **Saved**: Lista pomyślnie zapisanych (zielone)
   - **Skipped**: Lista pominiętych z powodami (czerwone)
     - Demo losowo pomija ~10% dla demonstracji
     - Powód: "duplicate_front"

## 🎯 Scenariusze testowe

### Scenariusz 1: Happy Path
```
1. Wklej 2000 znaków tekstu
2. Generate → Otrzymasz ~4 kandydaty
3. Zaakceptuj wszystkie (kliknij ✓ na każdym)
4. Save Accepted
5. Zobacz wynik w modal (większość saved, może 1 skipped)
```

### Scenariusz 2: Edycja kandydatów
```
1. Generate kandydaty
2. Kliknij Edit na jednym
3. Zmień front z "What is..." na "Co to jest..."
4. Zapisz
5. Zobacz badge "Edited"
6. Zaakceptuj i zapisz
```

### Scenariusz 3: Walidacja
```
1. Wklej < 1000 znaków → Ostrzeżenie żółte
2. Wklej > 10000 znaków → Zostanie obcięte + ostrzeżenie
3. Spróbuj wygenerować z < 1000 → Przycisk disabled
```

### Scenariusz 4: Modal edycji - walidacja
```
1. Otwórz modal edycji
2. Usuń cały tekst z front → Błąd "cannot be empty"
3. Wpisz 201+ znaków → Błąd "must be 200 characters or less"
4. Licznik pokaze "remaining" w czasie rzeczywistym
```

## 🔍 Czego szukać

### UI/UX:
- [ ] Animacje są płynne
- [ ] Liczniki działają w czasie rzeczywistym
- [ ] Toasty pojawiają się i znikają
- [ ] Modals otwierają/zamykają się poprawnie
- [ ] Focus trap w modalach (Tab nie wychodzi poza modal)
- [ ] Kolory zmieniają się zgodnie ze statusem
- [ ] Responsywność (zmień szerokość okna)

### Funkcjonalność:
- [ ] Accept/Reject/Edit działają
- [ ] Commit bar pokazuje poprawną liczbę
- [ ] CommitResultModal pokazuje saved/skipped
- [ ] Można edytować i ponownie zaakceptować

### Accessibility:
- [ ] Tab navigation działa
- [ ] Screen reader announcements (włącz VoiceOver/NVDA)
- [ ] Keyboard shortcuts (Cmd+Enter w modalu)

## 📊 Mock Data

### Generowane kandydaty:
- Liczba: 1 na każde 500 znaków (max 8)
- Score: Losowy między 0.78 - 0.95
- Tematy: Historia, nauka, geografia (przykładowe)

### Commit result:
- ~90% saved
- ~10% skipped (losowo)
- Powód skip: "duplicate_front"

## 🔄 Reset stanu

Aby przetestować od nowa:
1. Odśwież stronę (F5)
2. Lub wyczyść tekst i wygeneruj ponownie

## ⚠️ Ograniczenia Demo Mode

Demo mode **NIE** ma:
- ❌ Prawdziwej bazy danych (nic nie jest zapisywane)
- ❌ Autentykacji (auth guard wyłączony)
- ❌ AI generacji (kandydaty są stałe)
- ❌ Pollingu (zawsze sync response 200)
- ❌ Rate limiting (możesz generować w kółko)

Demo mode **MA**:
- ✅ Pełny UI flow
- ✅ Wszystkie komponenty
- ✅ Walidację
- ✅ Error handling (UI)
- ✅ Toast notifications
- ✅ Modals
- ✅ State management

## 🐛 Znane problemy

Jeśli coś nie działa:
1. Sprawdź konsolę (F12) - błędy?
2. Upewnij się że `npm run dev` działa
3. Sprawdź czy wszystkie pliki zostały zapisane
4. Restart serwera: Ctrl+C → `npm run dev`

## 📝 Co dalej?

Po przetestowaniu UI, następne kroki to:
1. Implementacja prawdziwych API endpoints
2. Integracja z Supabase
3. AI integration (OpenRouter)
4. Autentykacja
5. Rate limiting

---

**Miłego testowania! 🎉**

Jeśli znajdziesz bugi lub masz sugestie, zgłoś je.
