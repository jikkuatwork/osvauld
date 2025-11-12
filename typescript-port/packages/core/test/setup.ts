/**
 * Global test setup for Vitest
 *
 * This file runs before all tests and configures the test environment.
 */

// Extend timeout for crypto operations
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Setup global test environment
  // Mocks will be added in Phase 0.2
});

afterAll(() => {
  // Cleanup
});
