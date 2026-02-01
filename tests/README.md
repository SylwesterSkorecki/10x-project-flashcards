# Testing Guide

This project uses **Vitest** for unit and integration tests and **Playwright** for end-to-end (E2E) tests.

## Quick Start

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Running E2E Tests

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# View last test report
npm run test:e2e:report
```

## Project Structure

```
tests/
├── e2e/              # Playwright E2E tests
│   └── example.spec.ts
├── mocks/            # MSW mock handlers
│   ├── handlers.ts   # API mock definitions
│   ├── server.ts     # MSW server for Node (Vitest)
│   └── browser.ts    # MSW worker for Browser (Playwright)
└── unit/             # Standalone unit tests (optional)

src/
└── __tests__/        # Co-located unit tests
    ├── components/   # Component tests
    └── lib/          # Library/utility tests
```

## Unit Testing with Vitest

### Writing Tests

Unit tests are located in `src/__tests__/` directory, mirroring the source structure.

**Example: Testing a utility function**

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/utils';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

**Example: Testing a React component**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking with Vitest

#### Function Mocks

```typescript
import { vi } from 'vitest';

// Create a mock function
const mockFn = vi.fn();

// Mock with return value
mockFn.mockReturnValue('result');

// Mock with implementation
mockFn.mockImplementation((arg) => `Hello ${arg}`);

// Spy on existing function
const spy = vi.spyOn(myObject, 'myMethod');
```

#### Module Mocks

```typescript
// Mock entire module
vi.mock('@/lib/api-client', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mock' })),
}));

// Mock with factory function
vi.mock('@/lib/utils', () => {
  return {
    formatDate: vi.fn((date) => '2024-01-01'),
  };
});
```

### Using MSW for API Mocking

MSW (Mock Service Worker) is already configured and will automatically intercept API calls during tests.

**Customizing responses for specific tests:**

```typescript
import { server } from '../../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  // Override handler for this test
  server.use(
    http.get('/api/data', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );

  // Test code that calls /api/data
});
```

## E2E Testing with Playwright

### Writing E2E Tests

E2E tests are located in `tests/e2e/` directory.

**Example: Basic E2E test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    // Navigate to page
    await page.goto('/');
    
    // Interact with elements
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Assert outcomes
    await expect(page).toHaveURL(/\/success/);
    await expect(page.getByText('Success message')).toBeVisible();
  });
});
```

### Playwright Best Practices

1. **Use user-facing selectors**
   - Prefer `getByRole()`, `getByLabel()`, `getByText()`
   - Avoid CSS selectors when possible

2. **Wait for elements properly**
   ```typescript
   // Good - automatic waiting
   await page.getByRole('button').click();
   
   // When explicit wait needed
   await page.waitForLoadState('networkidle');
   ```

3. **Use test fixtures**
   ```typescript
   test.use({ viewport: { width: 1280, height: 720 } });
   ```

4. **Group related tests**
   ```typescript
   test.describe('Authentication', () => {
     test.beforeEach(async ({ page }) => {
       await page.goto('/auth/login');
     });
     
     test('login flow', async ({ page }) => {
       // test code
     });
   });
   ```

### Debugging E2E Tests

```bash
# Run with headed browser
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- tests/e2e/auth.spec.ts

# Run with debug mode (pause and step through)
npm run test:e2e:debug

# Generate trace on failure (view in UI)
npm run test:e2e -- --trace on
```

## Configuration Files

### vitest.config.ts

Configures Vitest test runner:
- Environment: jsdom (for DOM testing)
- Setup file: `vitest.setup.ts`
- Coverage: v8 provider
- Path alias: `@` → `./src`

### vitest.setup.ts

Global test setup:
- Loads `@testing-library/jest-dom` matchers
- Configures MSW server
- Mocks browser APIs (matchMedia, IntersectionObserver, etc.)
- Sets environment variables

### playwright.config.ts

Configures Playwright:
- Test directory: `./tests/e2e`
- Base URL: `http://localhost:4321`
- Browsers: Chromium (can add Firefox, WebKit)
- Screenshots and videos on failure
- Starts dev server automatically

## Coverage Reports

After running `npm run test:coverage`, open coverage report:

```bash
# Coverage report location
./coverage/index.html
```

Coverage is configured to exclude:
- `node_modules/`
- Build output directories
- Configuration files
- Type definition files
- Test files

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Tips & Best Practices

### Unit Tests
- Test behavior, not implementation
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests isolated and independent
- Mock external dependencies

### E2E Tests
- Test critical user journeys
- Keep tests focused and atomic
- Use Page Object Model for complex flows
- Don't test implementation details
- Ensure tests can run in any order

### General
- Run tests before committing
- Fix failing tests immediately
- Keep test data realistic
- Don't skip flaky tests - fix them
- Review test coverage regularly

## Troubleshooting

### Vitest Issues

**Tests not finding modules:**
- Check path aliases in `vitest.config.ts`
- Ensure `tsconfig.json` has correct paths

**DOM tests failing:**
- Verify jsdom environment is set
- Check if `@testing-library/jest-dom` is imported in setup

### Playwright Issues

**Browser not launching:**
```bash
npx playwright install --with-deps chromium
```

**Tests timing out:**
- Increase timeout in test: `test.setTimeout(60000)`
- Or in config: `timeout: 60000`

**Element not found:**
- Use `await page.pause()` to debug
- Check selector in Playwright Inspector

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
