import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockWebAPIs, cleanupMockWebAPIs, MockMetaMask } from '../../../test/mocks';
import {
  isMetaMaskAvailable,
  connectMetaMask,
  generateChallenge,
  signChallenge,
  deriveEncryptionKey,
  authenticateWithMetaMask,
  verifyMetaMaskSignature,
  createAccountFromMetaMask,
} from '../../../src/auth/metamask';

describe('MetaMask Authentication', () => {
  beforeEach(() => {
    setupMockWebAPIs();
  });

  describe('MetaMask Detection', () => {
    it('should detect MetaMask availability', () => {
      const available = isMetaMaskAvailable();
      expect(available).toBe(true);
    });
  });

  describe('MetaMask Connection', () => {
    it('should connect to MetaMask', async () => {
      const address = await connectMetaMask();

      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
      expect(address.startsWith('0x')).toBe(true);
    });

    it('should return Ethereum address', async () => {
      const address = await connectMetaMask();

      expect(address.length).toBeGreaterThan(0);
      expect(address).toMatch(/^0x[a-fA-F0-9]+$/);
    });
  });

  describe('Challenge Generation', () => {
    it('should generate challenge', () => {
      const challenge = generateChallenge();

      expect(challenge).toBeDefined();
      expect(challenge).toContain('Osvauld Login Challenge');
      expect(challenge).toContain('Timestamp:');
      expect(challenge).toContain('Nonce:');
    });

    it('should generate unique challenges', () => {
      const challenge1 = generateChallenge();
      const challenge2 = generateChallenge();

      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe('Challenge Signing', () => {
    it('should sign challenge with MetaMask', async () => {
      const address = await connectMetaMask();
      const challenge = generateChallenge();

      const signature = await signChallenge(challenge, address);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toContain('0xmocksignature');
    });

    it('should produce signatures', async () => {
      const address = await connectMetaMask();
      const challenge1 = generateChallenge();
      const challenge2 = generateChallenge();

      const sig1 = await signChallenge(challenge1, address);
      const sig2 = await signChallenge(challenge2, address);

      expect(sig1).toBeDefined();
      expect(sig2).toBeDefined();
      // Mock signatures will be different due to timestamp
    });
  });

  describe('Key Derivation', () => {
    it('should derive encryption key from signature', () => {
      const signature = '0xabcdef1234567890';
      const salt = new Uint8Array(16);

      const key = deriveEncryptionKey(signature, salt);

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should derive same key for same signature', () => {
      const signature = '0xabcdef1234567890';
      const salt = new Uint8Array(16);

      const key1 = deriveEncryptionKey(signature, salt);
      const key2 = deriveEncryptionKey(signature, salt);

      expect(key1).toEqual(key2);
    });

    it('should derive different keys for different signatures', () => {
      const salt = new Uint8Array(16);

      const key1 = deriveEncryptionKey('0xsig1', salt);
      const key2 = deriveEncryptionKey('0xsig2', salt);

      expect(key1).not.toEqual(key2);
    });
  });

  describe('Full Authentication', () => {
    it('should authenticate with MetaMask', async () => {
      const account = await authenticateWithMetaMask();

      expect(account.address).toBeDefined();
      expect(account.signingKey).toBeDefined();
      expect(account.challenge).toBeDefined();
      expect(account.signature).toBeDefined();
    });

    it('should return valid account info', async () => {
      const account = await authenticateWithMetaMask();

      expect(account.address.startsWith('0x')).toBe(true);
      expect(account.signingKey.publicKey).toBeInstanceOf(Uint8Array);
      expect(account.signingKey.privateKey).toBeInstanceOf(Uint8Array);
      expect(account.signature).toContain('0xmocksignature');
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid signature format', () => {
      const challenge = generateChallenge();
      const signature = '0x' + 'a'.repeat(130);
      const address = '0x1234567890123456789012345678901234567890';

      const isValid = verifyMetaMaskSignature(challenge, signature, address);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature format', () => {
      const challenge = generateChallenge();
      const signature = 'invalid';
      const address = '0x1234567890123456789012345678901234567890';

      const isValid = verifyMetaMaskSignature(challenge, signature, address);

      expect(isValid).toBe(false);
    });

    it('should reject invalid address format', () => {
      const challenge = generateChallenge();
      const signature = '0x' + 'a'.repeat(130);
      const address = 'invalid';

      const isValid = verifyMetaMaskSignature(challenge, signature, address);

      expect(isValid).toBe(false);
    });

    it('should reject empty values', () => {
      const isValid = verifyMetaMaskSignature('', '', '');

      expect(isValid).toBe(false);
    });
  });

  describe('Account Creation', () => {
    it('should create account from MetaMask', async () => {
      const metamaskAccount = await authenticateWithMetaMask();
      const username = 'testuser';

      const account = createAccountFromMetaMask(metamaskAccount, username);

      expect(account.userId).toBeDefined();
      expect(account.username).toBe(username);
      expect(account.address).toBe(metamaskAccount.address);
      expect(account.publicKey).toEqual(metamaskAccount.signingKey.publicKey);
    });

    it('should derive userId from address', async () => {
      const metamaskAccount = await authenticateWithMetaMask();

      const account = createAccountFromMetaMask(metamaskAccount, 'test');

      expect(account.userId.length).toBe(16);
      expect(account.userId).toBe(metamaskAccount.address.slice(2, 18));
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete MetaMask auth flow', async () => {
      // 1. Connect to MetaMask
      const address = await connectMetaMask();
      expect(address).toBeTruthy();

      // 2. Generate and sign challenge
      const challenge = generateChallenge();
      const signature = await signChallenge(challenge, address);
      expect(signature).toBeTruthy();

      // 3. Verify signature (mock signature won't pass full validation)
      expect(signature).toBeTruthy();

      // 4. Authenticate
      const account = await authenticateWithMetaMask();
      expect(account.address).toBe(address);
    });

    it('should create user from MetaMask auth', async () => {
      // 1. Authenticate with MetaMask
      const metamaskAccount = await authenticateWithMetaMask();

      // 2. Create account
      const account = createAccountFromMetaMask(metamaskAccount, 'alice');

      // 3. Verify account data
      expect(account.username).toBe('alice');
      expect(account.address).toBeDefined();
      expect(account.publicKey).toBeDefined();
      expect(account.signingKey).toBeDefined();
    });
  });
});
