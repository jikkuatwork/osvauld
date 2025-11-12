/**
 * Global test setup for Vitest
 *
 * This file runs before all tests and configures the test environment.
 */

// Extend timeout for crypto operations
import { beforeAll, afterAll } from 'vitest';
import { sha512 } from '@noble/hashes/sha512';
import * as ed from '@noble/ed25519';

beforeAll(() => {
  // Setup SHA512 for @noble/ed25519 in Node.js environment
  ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

  // Setup global test environment
  // Mocks will be added in Phase 0.2
});

afterAll(() => {
  // Cleanup
});
