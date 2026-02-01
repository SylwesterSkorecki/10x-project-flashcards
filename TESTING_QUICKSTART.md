# Testing Quick Start Guide

Ten przewodnik pomoże Ci szybko zacząć korzystać z testów w projekcie.

## Instalacja

Wszystkie zależności testowe są już zainstalowane. Jeśli potrzebujesz ponownie zainstalować:

```bash
npm install
```

## Uruchomienie Testów

### Testy Jednostkowe (Vitest)

```bash
# Uruchom wszystkie testy jednostkowe
npm test

# Uruchom testy w trybie watch (zalecane podczas rozwoju)
npm run test:watch

# Uruchom testy z interaktywnym UI
npm run test:ui

# Uruchom testy z raportem pokrycia
npm run test:coverage
```

### Testy E2E (Playwright)

```bash
# Najpierw uruchom serwer deweloperski (w osobnym terminalu)
npm run dev

# Następnie uruchom testy E2E (w drugim terminalu)
npm run test:e2e

# Uruchom testy z interfejsem Playwright
npm run test:e2e:ui

# Uruchom testy w trybie debugowania
npm run test:e2e:debug
```

## Struktura Projektu Testowego

```
10x-project-flashcards/
├── src/
│   └── __tests__/           # Testy jednostkowe (kolokowane z kodem)
│       ├── components/      # Testy komponentów React
│       └── lib/             # Testy funkcji pomocniczych
│
├── tests/
│   ├── e2e/                 # Testy E2E (Playwright)
│   ├── unit/                # Testy jednostkowe (opcjonalnie)
│   ├── mocks/               # Mocki MSW
│   │   ├── handlers.ts      # Definicje mocków API
│   │   ├── server.ts        # Serwer MSW dla Vitest
│   │   └── browser.ts       # Worker MSW dla Playwright
│   └── README.md            # Szczegółowa dokumentacja testów
│
├── vitest.config.ts         # Konfiguracja Vitest
├── vitest.setup.ts          # Setup globalny dla Vitest
└── playwright.config.ts     # Konfiguracja Playwright
```

## Przykłady

### Test Jednostkowy Komponentu React

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Test E2E z Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to login page', async ({ page }) => {
  await page.goto('/');
  
  const loginLink = page.getByRole('link', { name: /login/i });
  await loginLink.click();
  
  await expect(page).toHaveURL(/\/auth\/login/);
});
```

### Test API z MSW

```typescript
import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('API', () => {
  it('should handle errors', async () => {
    server.use(
      http.get('/api/data', () => {
        return HttpResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      })
    );

    const response = await fetch('/api/data');
    expect(response.status).toBe(404);
  });
});
```

## Wskazówki

### Dobre Praktyki

1. **Pisz testy przed commitowaniem kodu**
2. **Używaj trybu watch podczas rozwoju** - `npm run test:watch`
3. **Testuj zachowanie, nie implementację**
4. **Używaj opisowych nazw testów**
5. **Utrzymuj testy proste i czytelne**

### Debugowanie

#### Vitest
```bash
# Uruchom testy z debuggerem
npx vitest --inspect-brk

# Uruchom konkretny plik testowy
npx vitest src/__tests__/components/Button.test.tsx

# Uruchom testy pasujące do wzorca
npx vitest -t "should handle click"
```

#### Playwright
```bash
# Uruchom z headful browser
npm run test:e2e -- --headed

# Uruchom konkretny plik
npm run test:e2e -- tests/e2e/auth.spec.ts

# Uruchom w trybie debug (zatrzymuje wykonanie)
npm run test:e2e:debug
```

### Pokrycie Kodu

```bash
# Wygeneruj raport pokrycia
npm run test:coverage

# Raport będzie dostępny w:
# ./coverage/index.html
```

Otwórz plik w przeglądarce, aby zobaczyć szczegółowy raport pokrycia kodu.

## Problemy i Rozwiązania

### Testy nie przechodzą po aktualizacji zależności

```bash
# Wyczyść cache i reinstaluj
rm -rf node_modules package-lock.json
npm install
```

### Playwright nie może uruchomić przeglądarki

```bash
# Reinstaluj przeglądarki
npx playwright install --with-deps chromium
```

### MSW nie przechwytuje requestów

Sprawdź, czy:
1. Serwer MSW jest uruchomiony w `vitest.setup.ts`
2. Handlery są poprawnie zdefiniowane w `tests/mocks/handlers.ts`
3. URL w teście pasuje do URL w handlerze

## Więcej Informacji

Szczegółowa dokumentacja testów znajduje się w [tests/README.md](./tests/README.md)

## Zasoby

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
