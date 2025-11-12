# Test Suite Documentation

This directory contains the complete test suite for Osvauld TypeScript
Core library.

## Structure

```
test/
├── setup.ts              # Global test setup
├── helpers/              # Test helper functions
│   ├── crypto.ts         # Crypto test helpers
│   ├── async.ts          # Async test helpers
│   └── storage.ts        # Storage test helpers
├── mocks/                # Mock implementations
│   ├── indexeddb.ts      # IndexedDB mock (fake-indexeddb)
│   ├── webrtc.ts         # WebRTC mock (in-memory)
│   └── crypto.ts         # Web API mocks (MetaMask, etc)
├── fixtures/             # Test data fixtures
│   ├── users.ts          # Sample user data
│   ├── documents.ts      # Sample document data
│   └── keys.ts           # Sample encryption keys
├── unit/                 # Unit tests
│   ├── crypto/           # Crypto module tests
│   ├── storage/          # Storage module tests
│   ├── auth/             # Auth module tests
│   └── ...
└── integration/          # Integration tests
    ├── crypto/           # Crypto integration tests
    ├── auth/             # Auth flow tests
    └── e2e/              # End-to-end tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage
```

## Writing Tests

### Unit Tests

Unit tests should be isolated and fast. Use mocks for all
external dependencies.

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/module';

describe('MyModule', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Tests

Integration tests verify multiple modules working together.
Use mocks for external APIs (network, etc) but allow modules
to interact.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleA, ModuleB } from '../../src';

describe('Module Integration', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should integrate modules', async () => {
    const a = new ModuleA();
    const b = new ModuleB(a);
    const result = await b.process();
    expect(result).toBeDefined();
  });
});
```

## Test Helpers

### Crypto Helpers

- `generateRandomBytes(length)` - Generate random test data
- `hexToBytes(hex)` - Convert hex string to bytes
- `bytesToHex(bytes)` - Convert bytes to hex string

### Async Helpers

- `waitFor(condition, timeout)` - Wait for condition to be true
- `sleep(ms)` - Sleep for specified milliseconds
- `waitForValueChange(getValue, expected)` - Wait for value

### Storage Helpers

- `mockStorage()` - Create in-memory mock storage

## Mocks

### IndexedDB Mock

Uses `fake-indexeddb` to provide complete IndexedDB implementation
in Node.js. Automatically available globally.

```typescript
import { resetIndexedDB } from '../mocks';

beforeEach(() => {
  resetIndexedDB();
});
```

### WebRTC Mock

Provides in-memory peer connections for testing P2P without
network.

```typescript
import { createMockPeerPair } from '../mocks';

const [peer1, peer2] = createMockPeerPair();
peer1.send(data);
```

### MetaMask Mock

Mocks `window.ethereum` for testing MetaMask integration.

```typescript
import { MockMetaMask, setupMockWebAPIs } from '../mocks';

beforeEach(() => {
  setupMockWebAPIs();
});
```

## Fixtures

Test fixtures provide consistent test data across tests.

```typescript
import { testUsers, testDocuments } from '../fixtures';

const alice = testUsers.alice;
const doc = testDocuments.doc1;
```

## Coverage Requirements

Minimum coverage thresholds are configured in `vitest.config.ts`:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use fixtures** - Reuse test data from fixtures
3. **Mock externals** - Mock all external dependencies
4. **Test edge cases** - Test error conditions and edge cases
5. **Keep tests fast** - Unit tests should be < 100ms
6. **Descriptive names** - Test names should describe behavior
7. **Arrange-Act-Assert** - Follow AAA pattern
8. **Clean up** - Use afterEach to clean up state

## Debugging Tests

```bash
# Run specific test file
npm test -- test/unit/crypto/ed25519.test.ts

# Run tests matching pattern
npm test -- -t "should encrypt"

# Run with debug output
DEBUG=* npm test

# Run with inspector
node --inspect-brk node_modules/.bin/vitest
```

## Continuous Integration

Tests are run automatically on:

- Every commit (pre-commit hook)
- Every push to branch
- Pull request checks

All tests must pass before merging.
