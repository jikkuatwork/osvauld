import { describe, it, expect } from 'vitest';
import {
  deriveKey,
  generateSalt,
  verifyPassword,
  exportDerivedKey,
  importDerivedKey,
} from '../../../src/crypto/argon2';

// Use very light parameters for fast testing
const TEST_PARAMS = {
  memoryCost: 1024, // 1MB
  timeCost: 1,
  parallelism: 1,
};

describe('Argon2 Key Derivation', () => {
  describe('Salt Generation', () => {
    it('should generate a salt', () => {
      const salt = generateSalt();

      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('Key Derivation', () => {
    it('should derive a key from password', () => {
      const password = 'secure-password-123';
      const salt = generateSalt();

      const key = deriveKey(password, salt, TEST_PARAMS);

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should produce same key for same password and salt', () => {
      const password = 'test-password';
      const salt = generateSalt();

      const key1 = deriveKey(password, salt, TEST_PARAMS);
      const key2 = deriveKey(password, salt, TEST_PARAMS);

      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different passwords', () => {
      const salt = generateSalt();

      const key1 = deriveKey('password1', salt, TEST_PARAMS);
      const key2 = deriveKey('password2', salt, TEST_PARAMS);

      expect(key1).not.toEqual(key2);
    });

    it('should produce different keys for different salts', () => {
      const password = 'password';

      const key1 = deriveKey(password, generateSalt(), TEST_PARAMS);
      const key2 = deriveKey(password, generateSalt(), TEST_PARAMS);

      expect(key1).not.toEqual(key2);
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', () => {
      const password = 'correct-password';
      const salt = generateSalt();
      const key = deriveKey(password, salt, TEST_PARAMS);

      const isValid = verifyPassword(password, salt, key, TEST_PARAMS);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const salt = generateSalt();
      const key = deriveKey('correct', salt, TEST_PARAMS);

      const isValid = verifyPassword('incorrect', salt, key, TEST_PARAMS);

      expect(isValid).toBe(false);
    });
  });

  describe('Import/Export', () => {
    it('should export and import salt and key', () => {
      const salt = generateSalt();
      const key = deriveKey('password', salt, TEST_PARAMS);

      const exported = exportDerivedKey(salt, key);
      const imported = importDerivedKey(exported);

      expect(imported.salt).toEqual(salt);
      expect(imported.key).toEqual(key);
    });

    it('should export as base64 strings', () => {
      const salt = generateSalt();
      const key = deriveKey('password', salt, TEST_PARAMS);

      const exported = exportDerivedKey(salt, key);

      expect(typeof exported.salt).toBe('string');
      expect(typeof exported.key).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty password', () => {
      const salt = generateSalt();
      const key = deriveKey('', salt, TEST_PARAMS);

      expect(key.length).toBe(32);
    });

    it('should handle Unicode passwords', () => {
      const password = '密码🔐مرحبا';
      const salt = generateSalt();

      const key = deriveKey(password, salt, TEST_PARAMS);
      const isValid = verifyPassword(password, salt, key, TEST_PARAMS);

      expect(isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should benchmark with light parameters', () => {
      const password = 'benchmark-password';
      const salt = generateSalt();

      const startTime = Date.now();
      deriveKey(password, salt, TEST_PARAMS);
      const elapsed = Date.now() - startTime;

      console.log(`Argon2 (light params): ${elapsed}ms`);
      expect(elapsed).toBeLessThan(1000); // Should be < 1s with light params
    });
  });
});
