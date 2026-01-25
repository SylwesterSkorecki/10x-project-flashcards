# Hash Helper - Dokumentacja użycia

## Przegląd

Plik `src/lib/helpers/hash.ts` zawiera funkcję `hashSourceText()` do generowania SHA-256 hashy tekstów źródłowych.

**Status:** ✅ Aktywnie używana w `GenerationsService`

## Funkcja: `hashSourceText()`

### Sygnatura

```typescript
function hashSourceText(text: string): string;
```

### Opis

Generuje SHA-256 hash dla podanego tekstu. Używana głównie do:

- Hashowania tekstu źródłowego w operacjach generowania AI
- Wykrywania duplikatów żądań generowania
- Celów cache'owania

### Parametry

- **text** (string): Tekst do zhashowania

### Zwraca

- (string): Hexadecymalny string reprezentujący SHA-256 hash

### Przykład użycia

```typescript
import { hashSourceText } from "../lib/helpers/hash";

const sourceText = "Jakiś długi tekst do zhashowania...";
const hash = hashSourceText(sourceText);

console.log(hash);
// Output: "a1b2c3d4e5f6..."
```

## Dlaczego SHA-256?

✅ **Bezpieczeństwo**: SHA-256 jest kryptograficznie bezpieczny (w przeciwieństwie do MD5)  
✅ **Standardowy**: Powszechnie używany i wspierany  
✅ **Wydajność**: Wystarczająco szybki dla tego przypadku użycia  
✅ **Wbudowany**: Dostępny natywnie w Node.js (moduł `crypto`)

## Gdzie jest używana

Funkcja `hashSourceText` jest wykorzystywana w:

1. ✅ **`src/lib/services/generations.service.ts`** - Service layer dla operacji AI generation
2. ✅ **`src/pages/api/generations/index.ts`** - Endpoint POST /api/generations

## Przypadki użycia w projekcie

### 1. GenerationsService - Service Layer (Główne użycie)

```typescript
// src/lib/services/generations.service.ts
import { hashSourceText } from "../helpers/hash";

export class GenerationsService {
  // Metoda pomocnicza do hashowania
  createSourceTextHash(sourceText: string): string {
    return hashSourceText(sourceText);
  }

  // Wykrywanie duplikatów
  async findDuplicateGeneration(userId: string, sourceText: string) {
    const sourceTextHash = this.createSourceTextHash(sourceText);
    // ... query database
  }

  // Logowanie błędów
  async logGenerationError(userId: string, errorData, sourceText: string) {
    const sourceTextHash = this.createSourceTextHash(sourceText);
    // ... save to database
  }

  // Przygotowanie danych do zapisu
  prepareGenerationData(sourceText: string) {
    return {
      source_text_hash: this.createSourceTextHash(sourceText),
      source_text_length: sourceText.length,
    };
  }
}
```

### 2. POST /api/generations - Endpoint używający service

```typescript
// src/pages/api/generations/index.ts
import { GenerationsService } from "../../../lib/services/generations.service";

export const POST: APIRoute = async ({ request, locals }) => {
  const generationsService = new GenerationsService(locals.supabase);

  // Check for duplicates using hashing
  const existingId = await generationsService.findDuplicateGeneration(user.id, validatedData.source_text);

  // Prepare data with hash
  const generationData = generationsService.prepareGenerationData(validatedData.source_text);

  // Use generationData.source_text_hash in database insert
};
```

### 2. Wykrywanie duplikatów

```typescript
// Check if user already generated flashcards from this text
const { data: existing } = await supabase
  .from("generations")
  .select("id, created_at")
  .eq("user_id", userId)
  .eq("source_text_hash", sourceTextHash)
  .single();

if (existing) {
  // Return existing generation or inform user
  return new Response(
    JSON.stringify({
      message: "Już wygenerowałeś fiszki z tego tekstu",
      existing_generation_id: existing.id,
    }),
    { status: 409 }
  );
}
```

### 3. Logowanie błędów generowania

```typescript
import { hashSourceText } from "../../../lib/helpers/hash";

// When AI generation fails
const sourceTextHash = hashSourceText(sourceText);

await supabase.from("generation_error_logs").insert({
  user_id: userId,
  model: "gpt-4",
  error_code: "timeout",
  error_message: "Generation timed out after 30s",
  source_text_hash: sourceTextHash,
  source_text_length: sourceText.length,
});
```

## Właściwości SHA-256

- **Długość hashu**: 64 znaki hex (256 bitów)
- **Deterministyczny**: Ten sam input zawsze daje ten sam hash
- **Jednostronne hashowanie**: Nie można odtworzyć tekstu z hashu
- **Kolizje**: Praktycznie niemożliwe

## Testowanie

```typescript
// Example tests (when implemented)
import { hashSourceText } from "./hash";

// Test 1: Consistent hashing
const text = "Hello, world!";
const hash1 = hashSourceText(text);
const hash2 = hashSourceText(text);
console.assert(hash1 === hash2, "Hashes should be identical");

// Test 2: Different inputs produce different hashes
const hash3 = hashSourceText("Different text");
console.assert(hash1 !== hash3, "Different inputs should have different hashes");

// Test 3: Hash format
console.assert(hash1.length === 64, "SHA-256 hash should be 64 hex characters");
console.assert(/^[a-f0-9]{64}$/.test(hash1), "Hash should contain only hex characters");
```

## Bezpieczeństwo

### ✅ Zalety SHA-256

- **Brak znanych kolizji** - praktycznie niemożliwe aby 2 różne teksty dały ten sam hash
- **Odporny na ataki** - SHA-256 jest odporny na known attack vectors
- **FIPS approved** - zatwierdzony przez NIST

### ❌ Dlaczego NIE MD5?

- MD5 ma znane kolizje
- Uważany za kryptograficznie złamany
- Nie powinien być używany w nowych projektach

## Performance

Dla typowych rozmiarów tekstów (1000-10000 znaków):

- **Czas wykonania**: < 1ms
- **Overhead**: Minimalny
- **Skalowanie**: Liniowe z długością tekstu

## Integracja z bazą danych

### Schema

```sql
-- Table: generations
CREATE TABLE generations (
  ...
  source_text_hash VARCHAR NOT NULL,
  source_text_length INTEGER NOT NULL,
  ...
);

-- Table: generation_error_logs
CREATE TABLE generation_error_logs (
  ...
  source_text_hash VARCHAR NOT NULL,
  source_text_length INTEGER NOT NULL,
  ...
);
```

### Index dla wydajności

```sql
-- Optional: Index for duplicate detection
CREATE INDEX idx_generations_user_hash
ON generations(user_id, source_text_hash);
```

## Notatki

- **Przechowywanie**: Przechowujemy tylko hash, nie sam tekst źródłowy (privacy)
- **Length tracking**: Zapisujemy również długość tekstu dla analytics
- **User scoping**: Hash jest unikalny per user (możesz mieć duplicate hashe między userami)

## Related Files

- **Implementation:** `src/lib/helpers/hash.ts`
- **Service using it:** `src/lib/services/generations.service.ts` ✅
- **Endpoint using it:** `src/pages/api/generations/index.ts` ✅
- **Types:** `src/types.ts` (CreateGenerationErrorLogCommand)
- **Database:** `src/db/database.types.ts`
- **Migrations:** `supabase/migrations/20251123100000_create_flashcards_generations_error_logs.sql`

## Implementation Status

| Component             | Status         | File                                      |
| --------------------- | -------------- | ----------------------------------------- |
| Hash Helper           | ✅ Implemented | `src/lib/helpers/hash.ts`                 |
| Generations Service   | ✅ Implemented | `src/lib/services/generations.service.ts` |
| POST /api/generations | ⚠️ Placeholder | `src/pages/api/generations/index.ts`      |
| AI Generation Logic   | ⏳ TODO        | -                                         |

**Note:** Endpoint `/api/generations` zwraca status 501 (Not Implemented) - logika AI generation wymaga jeszcze implementacji, ale hashowanie jest w pełni funkcjonalne.
