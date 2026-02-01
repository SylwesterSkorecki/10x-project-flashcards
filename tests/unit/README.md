# Testy jednostkowe (Unit Tests)

## Przegląd

Ten folder zawiera testy jednostkowe dla kluczowych komponentów aplikacji.

## Struktura

```
tests/unit/
├── README.md                        # Ten plik
├── api-client.test.ts              # Przykładowe testy z MSW
└── generations.service.test.ts     # Testy GenerationsService ⭐
```

## Aktualnie przetestowane moduły

### ✅ GenerationsService (59 testów)
Kompleksowe testy dla serwisu generacji flashcards:
- `_parseGenerationResponse` - parsowanie odpowiedzi AI
- `_convertToGenerationCandidates` - konwersja do formatu kandydatów
- `estimateGenerationCost` - estymacja kosztów tokenów
- `generateFlashcards` - walidacje input i obsługa błędów

**Dokumentacja:** Zobacz `.ai/generations-service-tests-summary.md`

## Uruchomienie testów

### Wszystkie testy jednostkowe
```bash
npm test
```

### Konkretny plik
```bash
npm test -- tests/unit/generations.service.test.ts
```

### Watch mode (development)
```bash
npm run test:watch
```

### UI mode (interactive)
```bash
npm run test:ui
```

### Coverage report
```bash
npm run test:coverage
```

## Konwencje testowania

### Nazewnictwo
- Pliki: `*.test.ts`
- Pattern: `{nazwa-modułu}.test.ts`
- Testy prywatnych metod: używamy `(service as any)._privateMethod()`

### Struktura testu
```typescript
describe("ServiceName", () => {
  let service: ServiceName;
  let mockDependency: MockType;

  beforeEach(() => {
    // Setup - arrange
    vi.clearAllMocks();
    mockDependency = createMock();
    service = new ServiceName(mockDependency);
  });

  describe("methodName", () => {
    it("should do something when condition", () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = service.methodName(input);
      
      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

### Mockowanie

#### Zewnętrzne moduły
```typescript
vi.mock("@/lib/services/external.service", () => {
  const MockClass = vi.fn().mockImplementation(function(this: any) {
    this.method = vi.fn();
    return this;
  });
  
  return { ExternalService: MockClass };
});
```

#### Supabase Client
```typescript
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {...}, error: null }),
} as any;
```

### Best Practices

1. **Izolacja testów**
   - Każdy test powinien być niezależny
   - Używaj `beforeEach` do resetowania stanu
   - Nie dziel stanu między testami

2. **Arrange-Act-Assert**
   - **Arrange:** Setup danych i mocków
   - **Act:** Wywołaj testowaną metodę
   - **Assert:** Sprawdź rezultaty

3. **Testuj edge cases**
   - Happy path
   - Błędy walidacji
   - Wartości graniczne
   - Puste/null/undefined
   - Długie wartości

4. **Nazwy testów**
   - Używaj: `should [action] when [condition]`
   - Przykład: `should throw error when input is empty`
   - Bądź deskryptywny

5. **Mocki i Spy**
   - Mockuj zewnętrzne zależności
   - Spy na metody do weryfikacji wywołań
   - Resetuj mocki w `beforeEach`

## Konfiguracja

### vitest.config.ts
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

### Dostępne matchers

Vitest + @testing-library/jest-dom:
- `expect(value).toBe(expected)`
- `expect(value).toEqual(expected)`
- `expect(value).toMatchObject(subset)`
- `expect(fn).toThrow(error)`
- `expect(value).toBeGreaterThan(n)`
- `expect(array).toHaveLength(n)`
- `expect(obj).toHaveProperty('key')`
- `expect(mock).toHaveBeenCalledWith(...args)`

## Debug testów

### Console logs
```typescript
it("should debug", () => {
  console.log("Debug info:", result);
  // Logi pojawią się w output testów
});
```

### VS Code debugger
1. Ustaw breakpoint w teście
2. Użyj launch configuration (`.vscode/launch.json`)
3. Run > Start Debugging

### Vitest UI
```bash
npm run test:ui
```
- Graficzny interface
- Filtrowanie testów
- Zobacz stack traces
- Time profiling

## Dalsza lektura

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- Cursor Rule: `.cursor/rules/vitest-unit-testing.mdc`
- Test Plan: `.ai/test-plan.md`

## Zadania TODO

### Priorytetowe:
- [ ] FlashcardsService testy
- [ ] OpenRouterService testy
- [ ] API endpoints testy (z MSW)
- [ ] Auth helpers testy

### Nice to have:
- [ ] Components testy (React)
- [ ] Utilities testy
- [ ] Validation schemas testy
- [ ] Error handlers testy

## Pytania?

Sprawdź:
1. `.ai/unit-testing-recommendations.md` - rekomendacje
2. `.cursor/rules/vitest-unit-testing.mdc` - guidelines
3. `tests/unit/generations.service.test.ts` - przykład kompletnych testów
