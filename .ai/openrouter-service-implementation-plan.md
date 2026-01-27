# OpenRouter Service — Plan implementacji

Poniższy dokument to kompletny przewodnik implementacji usługi integrującej OpenRouter (openrouter.ai) z aplikacją opartą na stacku: Astro 5, TypeScript 5, React 19, Tailwind 4, Supabase. Zawiera wymagane komponenty, przykłady konfiguracji wiadomości oraz szczegółowy plan wdrożenia.

> Uwaga: sekcja "implementation_breakdown" zawiera skróconą, jawnie ustrukturyzowaną analizę projektową (bez ujawniania prywatnych myśli).

<implementation_breakdown>
- Kluczowe komponenty:
  1. OpenRouterClient — klient HTTP zarządzający połączeniem do OpenRouter (autoryzacja, retry, logowanie).
  2. ConversationAdapter — warstwa mapująca lokalny format czatu (messages) na strukturę oczekiwaną przez OpenRouter i odwrotnie.
  3. ResponseValidator — walidator odpowiedzi z obsługą `response_format` (JSON Schema).
  4. RateLimiter/Backoff — mechanizm ochrony przed limitami i agresywnymi retry.
  5. Telemetria i logowanie — zbieranie metryk, zdarzeń błędów i kosztów.
  6. Config/SecretsManager — bezpieczne przechowywanie kluczy i mapowania modeli.
</implementation_breakdown>

---

## 1. Opis usługi

OpenRouterService to moduł TypeScript zapewniający bezpieczną i ustandaryzowaną integrację z OpenRouter API w celu generowania odpowiedzi LLM w ramach czatu. Zapewnia:
- jednolity klient HTTP z retry i backoff,
- translację i walidację `response_format` (JSON Schema),
- obsługę parametrów modelu i mapowania nazw modeli,
- centralne logowanie i metryki kosztów.

Usługa powinna być używana przez serwerowe API w `src/pages/api/*` lub przez backendową warstwę w `src/lib/services`.

## 2. Opis konstruktora

Przykładowy konstruktor (opis pola i typów):

```ts
new OpenRouterService({
  apiKey: string,                     // wymagane, pobierane z env (SUPABASE/ENV)
  baseUrl?: string,                   // opcjonalnie: override domyślnego endpointu OpenRouter
  defaultModel?: string,              // np. "openai/gpt-4o-mini", "anthropic/claude-2"
  timeoutMs?: number,                 // timeout HTTP
  maxRetries?: number,                // liczba retry przy błędach sieciowych/5xx
  retryBackoffBaseMs?: number,        // backoff base
  rateLimit?: { requests: number, perSeconds: number }, // lokalny limiter
  telemetry?: TelemetryClient,        // opcjonalnie: integracja z metrykami
  responseSchemas?: Record<string, JSONSchema> // predefiniowane schematy odpowiedzi
})
```

Konstruktor inicjalizuje:
- fetch client z nagłówkiem Authorization `Bearer ${apiKey}`,
- retry/backoff policy,
- opcjonalny lokalny rate limiter,
- cache mapowania nazw modeli (jeśli potrzebne).

## 3. Publiczne metody i pola

Poniżej przykładowe API modułu.

- sendChatMessage(conversationId: string, messages: ChatMessage[], options?: SendOptions): Promise<ModelResponse>
  - Opis: wysyła rozmowę do OpenRouter i zwraca uporządkowaną, zwalidowaną odpowiedź.
  - Options:
    - model?: string
    - temperature?: number
    - maxTokens?: number
    - responseFormat?: ResponseFormat (zawiera schemat JSON)
    - stream?: boolean

- getModelInfo(model?: string): Promise<ModelMetadata>
  - Opis: mapuje aliasy/model names i zwraca metadane (koszt, ograniczenia tokenów).

- validateResponse(schemaName: string, response: unknown): ValidationResult
  - Opis: waliduje strukturę odpowiedzi zgodnie z `response_format`.

- setApiKey(key: string): void
  - Opis: aktualizacja klucza (np. rotacja).

Pola:
- defaultModel (string)
- lastRequestMeta (meta info dla debugowania)

Interfejsy (sugestia):

```ts
type Role = 'system'|'user'|'assistant';
interface ChatMessage { role: Role; content: string; name?: string; metadata?: Record<string, any> }
interface ResponseFormat {
  type: 'json_schema';
  json_schema: { name: string; strict: boolean; schema: any }
}
```

## 4. Prywatne metody i pola

- _request(payload): internal HTTP wrapper
  - Obsługuje fetch, timeout, retry, backoff, logowanie request/response sizes i kosztów.

- _mapToOpenRouterMessages(messages: ChatMessage[]): OpenRouterMessage[]
  - Mapuje lokalny model wiadomości do struktury zgodnej z OpenRouter (role, content, name).

- _applyResponseFormat(response, responseFormat)
  - Wydobywa modelową odpowiedź i waliduje/parsuje JSON zgodnie z `response_format`.

- _handleStream(stream, onEvent)
  - Dla trybu stream: parsuje chunkowane dane, emituje partiale i finalne zdarzenia.

- _handleRateLimit(headers)
  - Wyciąga informacje o limitach z nagłówków i odpowiednio ustawia backoff.

- _logTelemetry(event)
  - Rejestruje zdarzenia kosztowe i błędy do telemetry (Prometheus/Datadog/Sentry).

Pola prywatne:
- _httpClient, _apiKey, _baseUrl, _retryPolicy, _rateLimiter, _schemasCache

## 5. Obsługa błędów

Potencjalne scenariusze błędów (numerowane) i zalecane reakcje:

1. Błąd autoryzacji (401/403)
   - Działanie: natychmiastowe przerwanie operacji, logowanie, zwrócenie błędu do klienta z kodem 401/403.
   - Rozwiązanie: sprawdzenie i rotacja klucza, walidacja formatów kluczy, opcjonalne ponowne pobranie z Secrets Manager.

2. Błędy limitów i throttling (429)
   - Działanie: exponential backoff + jitter; zapisz event telemetry; opcjonalne odrzucenie żądań przy pełnym obciążeniu.
   - Rozwiązanie: implementacja lokalnego rate-limiter, kolejki z priorytetami, limit kosztów per-klucz.

3. Błędy sieciowe / 5xx od OpenRouter
   - Działanie: repeatable retry z backoff do maxRetries; jeśli ciągłe 5xx, zwrócić błąd serwera 502/503 upstream.
   - Rozwiązanie: circuit breaker (otwarcie na okres jeśli wysoki odsetek błędów).

4. Niepoprawny format odpowiedzi / walidacja JSON Schema
   - Działanie: jeśli `strict: true` → odrzuć odpowiedź i zgłoś jako błąd walidacji; jeśli false → próbuj heurystycznej naprawy.
   - Rozwiązanie: loguj surową odpowiedź, zapytaj model ponownie z instrukcją "Odpowiedz zgodnie z JSON Schema", zastosuj fallback parsing.

5. Timeouty i częściowe odpowiedzi (stream przerwane)
   - Działanie: rozpoznaj częściowe dane, wykonaj retry lub przywróć stan konwersacji.
   - Rozwiązanie: stabilny stream parser, zapisywanie checkpointów konwersacji.

6. Błędy kosztowe / nieoczekiwane zużycie tokenów
   - Działanie: monitoruj koszt; jeśli przekroczenie progu → blokada wysyłania do produkcji dla danego klucza.
   - Rozwiązanie: limity budżetowe, alerty, pre-flight estimate tokenów.

## 6. Kwestie bezpieczeństwa

- Przechowywanie kluczy:
  - Używaj env vars (np. `OPENROUTER_API_KEY`) i Secrets Manager (Supabase Secrets, Vault). Nie commituj do repo.

- Least privilege:
  - Jeśli OpenRouter wspiera role/limity kluczy, nadaj ograniczenia czasowe i limity kosztów.

- Sanitizacja wejścia:
  - Odrzuć lub oczyszczaj niebezpieczne treści w `system`/`user` messages przed wysłaniem do modelu (np. wprowadzanie raw SQL).

- Audyt i logowanie:
  - Nie loguj pełnych treści PII. Maskuj lub hashuj pola w telemetry/logach.

- Rate limiting i circuit breaker:
  - Zapobiega eskalacji kosztów i wpływowi błędów zewnętrznych.

- Content filtering:
  - Wprowadź warstwę filtrowania odpowiedzi jeśli aplikacja obsługuje wrażliwe treści.

## 7. Konfiguracja wiadomości i response_format (konkretne przykłady)

1) Komunikat systemowy (System Message)

Przykład:

```json
{
  "role": "system",
  "content": "You are an assistant that returns only valid JSON matching the provided schema. Never include explanation outside the JSON object."
}
```

Zastosowanie: dodaj jako pierwszą wiadomość w payloadzie — ujednolica behavior modelu.

2) Komunikat użytkownika (User Message)

Przykład:

```json
{
  "role": "user",
  "content": "Stwórz fiszkę z pytaniem i odpowiedzią dla tematu: 'HTTP caching'. Zwróć wynik zgodnie z response_format."
}
```

3) Response_format — przykład poprawnie zdefiniowanego schematu

Wzorzec:
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "flashcard_schema_v1",
    "strict": true,
    "schema": {
      "type": "object",
      "required": ["question","answer","difficulty"],
      "properties": {
        "question": { "type": "string" },
        "answer": { "type": "string" },
        "difficulty": { "type": "string", "enum": ["easy","medium","hard"] },
        "tags": { "type": "array", "items": { "type": "string" } }
      },
      "additionalProperties": false
    }
  }
}
```

Zastosowanie w implementacji:
- Dołącz `response_format` bezpośrednio w body wysyłanego payloadu do OpenRouter (pole `response_format` zgodnie z API OpenRouter).
- Po otrzymaniu odpowiedzi użyj ResponseValidator; jeśli `strict: true` i walidacja nie przejdzie → zainicjuj retry z doprecyzowaniem promptu.

4) Nazwa modelu — przykłady i strategia

- Przykłady: `"openai/gpt-4o-mini"`, `"anthropic/claude-2"`, `"google/vertex-wealthy-model"` (mapuj aliasy do wartości oczekiwanych przez OpenRouter).
- Strategia:
  - Trzy poziomy: `defaultModel` (np. tańszy, szybki), `highQualityModel` (droższy), `fallbackModel`.
  - W metadata requestu przechowuj użyty model i koszt estimate.

5) Parametry modelu — typowe pola i wartości

- temperature (0.0–1.2) — kontrola kreatywności; do zwracania ściśle sformatowanego JSON ustaw 0–0.2.
- max_tokens — limit odpowiedzi (dobrze ustawić bezpieczny cap).
- top_p, top_k — alternatywa do temperature (opcjonalnie).
- stop — sekwencje przerywające generację.
- presence_penalty / frequency_penalty — jeśli dostępne.

Przykładowy options object:

```ts
{
  model: "openai/gpt-4o-mini",
  temperature: 0.0,
  max_tokens: 400,
  response_format: { type: 'json_schema', json_schema: { name: 'flashcard_schema_v1', strict: true, schema: { /* ... */ } } }
}
```

## 8. Szczegółowy plan wdrożenia krok po kroku (dostosowany do stacku)

Faza 0 — Przygotowanie środowiska
1. Dodaj env vars: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` (opcjonalne), `OPENROUTER_DEFAULT_MODEL`.
2. Zadbaj o Secrets Manager (Supabase env lub Vault) i dodaj instrukcję rotacji kluczy.
3. Zaktualizuj README z instrukcjami lokalnego uruchomienia i zmiennymi środowiskowymi.

Faza 1 — Implementacja klienta
1. W `src/lib/services` utwórz `openrouter.service.ts`.
2. Implementuj konstruktor zgodnie z sekcją 2.
3. Dodaj wewnętrzny HTTP wrapper oparty na fetch/undici z timeout i retry.
4. Dodaj prosty rate limiter (token-bucket) i circuit breaker.
5. Pokryj klient testami jednostkowymi (mock fetch).

Faza 2 — ConversationAdapter i response_format
1. Implementuj `_mapToOpenRouterMessages` aby wspierać role `system`, `user`, `assistant`.
2. Zdefiniuj standardowe `system` messages w `src/lib/openrouter/templates.ts`.
3. Implementuj `ResponseValidator` używając biblioteki JSON Schema (ajv).
4. Dodaj mechanizm retry-on-invalid-response: jeśli walidacja nie przejdzie → poproś model o ponowne wygenerowanie tylko pola JSON (z ograniczonym retry).

Faza 3 — Integracja z API aplikacji
1. W endpointzie `src/pages/api/flashcards/[id].ts` lub dedykowanym endpoint `src/pages/api/generate` użyj `OpenRouterService.sendChatMessage`.
2. Stwórz adapter wejścia, który przyjmuje front-endowe `messages` i opcjonalny `responseFormat`.
3. Zaimplementuj kontrolę kosztów — pre-flight estimate tokenów jeśli dostępne.

Faza 4 — Observability i bezpieczeństwo
1. Dodaj logowanie request/response meta (rozmiary, model, tokens), bez logowania PII.
2. Instrumentuj metryki (request count, error count, cost/usage).
3. Dodaj alerts w GH Actions / monitoring (np. gdy koszty rosną).

## 9. Dodatkowe uwagi i najlepsze praktyki
- Ustaw `temperature: 0` dla ścisłej zgodności ze schematami.
- Zawsze używaj `system` message, aby narzucić reguły zachowania modelu (np. "odpowiadaj wyłącznie JSON").
- Używaj `strict: true` w produkcyjnych endpointach, ale dopuszczaj `strict: false` w trybie eksperymentalnym.
- Monitoruj koszty tokenów i wprowadź limity per-tenant.
- Dokumentuj wszystkie schema w `src/lib/schemas` i wersjonuj je.

---

Plik stworzony jako przewodnik implementacyjny — użyj go jako check-listy przy wdrożeniu i do implementacji `OpenRouterService` w `src/lib/services`.

