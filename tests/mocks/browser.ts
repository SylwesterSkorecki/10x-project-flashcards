import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW Worker for Browser environment (Playwright)
 * This can be used to intercept HTTP requests during E2E tests
 */
export const worker = setupWorker(...handlers);
