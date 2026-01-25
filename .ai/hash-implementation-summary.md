# Hash Function Implementation Summary

## Status: ✅ Zaimplementowane i używane

Funkcja `hashSourceText()` jest teraz aktywnie wykorzystywana w projekcie.

---

## Co zostało zaimplementowane

### 1. Hash Helper (`src/lib/helpers/hash.ts`)

```typescript
export function hashSourceText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
```

**Właściwości:**

- Algorytm: SHA-256 (bezpieczny, współczesny standard)
- Output: 64-znakowy hexadecymalny string
- Deterministyczny: ten sam input = ten sam hash

---

### 2. Generations Service (`src/lib/services/generations.service.ts`)

**Nowy service layer zawierający 4 metody:**

#### a) `createSourceTextHash(sourceText: string): string`

- Tworzy hash z tekstu źródłowego
- Wrapper wokół `hashSourceText()` dla spójności API

#### b) `findDuplicateGeneration(userId: string, sourceText: string): Promise<string | null>`

- Sprawdza czy user już generował fiszki z tego samego tekstu
- Używa hashu do wykrywania duplikatów
- Zwraca ID istniejącego generowania lub null

#### c) `logGenerationError(userId, errorData, sourceText): Promise<GenerationErrorLogDTO | null>`

- Loguje błędy generowania AI do bazy danych
- Automatycznie hashuje source text przed zapisem
- Nie przechowuje surowego tekstu (privacy)

#### d) `prepareGenerationData(sourceText: string)`

- Przygotowuje dane do zapisu w bazie
- Zwraca obiekt z `source_text_hash` i `source_text_length`

---

### 3. API Endpoint (`src/pages/api/generations/index.ts`)

**POST /api/generations** - Placeholder implementation

**Funkcjonalność:**

- ✅ Walidacja źródła tekstu (1000-10000 znaków)
- ✅ Autoryzacja JWT
- ✅ Wykrywanie duplikatów (używa `GenerationsService.findDuplicateGeneration()`)
- ✅ Przygotowanie danych z hashowaniem (używa `GenerationsService.prepareGenerationData()`)
- ✅ Error logging (używa `GenerationsService.logGenerationError()`)
- ⏳ AI generation logic (TODO - zwraca 501 Not Implemented)

**Zwraca:**

- `201` - Generation created (gdy AI logic będzie zaimplementowana)
- `400` - Validation error
- `401` - Unauthorized
- `409` - Duplicate source text (już generowano z tego tekstu)
- `500` - Internal server error
- `501` - Not Implemented (obecny placeholder)

---

### 4. Typy i Błędy

**Dodano nowy typ błędu:**

```typescript
// src/types.ts i src/lib/helpers/api-error.ts
type ApiErrorCode =
  | ...
  | "duplicate_source"  // ← NOWY
  | ...
```

Używany gdy user próbuje wygenerować fiszki z tekstu, który już był użyty.

---

## Jak to działa w praktyce

### Flow dla POST /api/generations:

```
1. User wysyła request z source_text
   ↓
2. Endpoint waliduje dane (Zod schema)
   ↓
3. GenerationsService.findDuplicateGeneration()
   - Hashuje source_text (SHA-256)
   - Sprawdza w bazie czy hash już istnieje dla tego usera
   ↓
4a. Jeśli duplikat → zwraca 409 z ID istniejącego generowania
4b. Jeśli nie → kontynuuj
   ↓
5. GenerationsService.prepareGenerationData()
   - Hashuje source_text
   - Przygotowuje dane (hash + length)
   ↓
6. [TODO] AI Generation Logic
   ↓
7. Zapis do bazy z hashem (bez surowego tekstu)
```

### Flow dla error logging:

```
1. Błąd podczas generowania AI
   ↓
2. GenerationsService.logGenerationError()
   - Hashuje source_text
   - Zapisuje błąd z hashem do generation_error_logs
   ↓
3. Surowy tekst NIE jest przechowywany (privacy)
```

---

## Bezpieczeństwo i Privacy

✅ **SHA-256** - kryptograficznie bezpieczny hash  
✅ **Brak przechowywania surowego tekstu** - tylko hash i długość  
✅ **Per-user scoping** - duplikaty sprawdzane per user  
✅ **Deterministyczny** - ten sam tekst = ten sam hash  
✅ **Nieodwracalny** - nie można odzyskać tekstu z hashu

---

## Pliki zmodyfikowane/dodane

### Nowe pliki (3):

1. `src/lib/helpers/hash.ts` - Implementacja hashowania
2. `src/lib/services/generations.service.ts` - Service layer z użyciem hashu
3. `src/pages/api/generations/index.ts` - Endpoint placeholder

### Zmodyfikowane pliki (3):

1. `src/types.ts` - Dodano `duplicate_source` error code
2. `src/lib/helpers/api-error.ts` - Dodano `duplicate_source` error code
3. `.ai/hash-helper-usage.md` - Zaktualizowano dokumentację

---

## Testing

### Weryfikacja:

- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: Compilation successful
- ✅ Build: Success

### Przykładowy test (manual):

```bash
# Test endpoint (zwróci 501 Not Implemented, ale pokaże że hashowanie działa)
curl -X POST http://localhost:4321/api/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source_text": "'$(python3 -c 'print("A" * 1500)')'",
    "model": "gpt-4"
  }'

# Expected response:
{
  "message": "Generation endpoint not fully implemented yet",
  "debug": {
    "source_text_hash": "abcdef...",  // 64-char SHA-256 hash
    "source_text_length": 1500,
    "model": "gpt-4"
  }
}
```

---

## Next Steps (TODO)

Aby endpoint był w pełni funkcjonalny, potrzeba:

1. **Implementacja AI Generation Logic:**
   - Integracja z OpenRouter/OpenAI API
   - Generowanie kandydatów fiszek
   - Timeout handling

2. **Database Operations:**
   - INSERT do tabeli `generations`
   - Zapis wygenerowanych kandydatów

3. **Response Format:**
   - Zwracanie `CreateGenerationResponseSync` z kandydatami
   - Lub `CreateGenerationResponseAsync` dla długich operacji

4. **Testing:**
   - Integration tests dla całego flow
   - Unit tests dla `GenerationsService`
   - Error handling scenarios

---

## Podsumowanie

✅ **Hash helper:** Zaimplementowany i działający  
✅ **GenerationsService:** Kompletny z 4 metodami używającymi hashu  
✅ **API Endpoint:** Placeholder gotowy, używa hashowania  
⏳ **AI Logic:** Do zaimplementowania

**Funkcja `hashSourceText()` jest teraz aktywnie używana w kodzie produkcyjnym!**
