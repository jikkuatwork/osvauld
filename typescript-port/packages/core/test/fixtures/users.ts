/**
 * Test fixtures for user data
 */

export const testUsers = {
  alice: {
    id: 'user-alice-001',
    username: 'alice',
    email: 'alice@example.com',
    publicKey: '0xalice-public-key',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  },
  bob: {
    id: 'user-bob-002',
    username: 'bob',
    email: 'bob@example.com',
    publicKey: '0xbob-public-key',
    createdAt: new Date('2024-01-02T00:00:00Z'),
  },
  charlie: {
    id: 'user-charlie-003',
    username: 'charlie',
    email: 'charlie@example.com',
    publicKey: '0xcharlie-public-key',
    createdAt: new Date('2024-01-03T00:00:00Z'),
  },
};

export const testPasswords = {
  alice: 'alice-secure-password-123',
  bob: 'bob-secure-password-456',
  charlie: 'charlie-secure-password-789',
};

export const testMnemonics = {
  alice:
    'abandon abandon abandon abandon abandon abandon ' +
    'abandon abandon abandon abandon abandon about',
  bob: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
  charlie: 'test test test test test test test test test test test junk',
};
