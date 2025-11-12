import { describe, it, expect } from 'vitest';
import {
  generateKey,
  encrypt,
  decrypt,
  decryptString,
  exportKey,
  importKey,
  exportKeyBase64,
  importKeyBase64,
  deriveKeyFromPassword,
} from '../../../src/crypto/aes';

describe('AES-GCM Crypto', () => {
  describe('Key Generation', () => {
    it('should generate a key', async () => {
      const key = await generateKey();

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should generate unique keys', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();

      const key1Bytes = await exportKey(key1);
      const key2Bytes = await exportKey(key2);

      expect(key1Bytes).not.toEqual(key2Bytes);
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt a string', async () => {
      const key = await generateKey();
      const message = 'Hello, World!';

      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, key);

      expect(decrypted).toBe(message);
    });

    it('should encrypt and decrypt Uint8Array', async () => {
      const key = await generateKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = await encrypt(data, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should produce unique IVs for each encryption', async () => {
      const key = await generateKey();
      const message = 'Same message';

      const encrypted1 = await encrypt(message, key);
      const encrypted2 = await encrypt(message, key);

      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    });

    it('should fail with wrong key', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      const message = 'Secret message';

      const encrypted = await encrypt(message, key1);

      await expect(decrypt(encrypted, key2)).rejects.toThrow(
        /Decryption failed/
      );
    });

    it('should fail with tampered ciphertext', async () => {
      const key = await generateKey();
      const message = 'Secret message';

      const encrypted = await encrypt(message, key);

      // Tamper with ciphertext
      encrypted.ciphertext[0] = encrypted.ciphertext[0]! ^ 0xff;

      await expect(decrypt(encrypted, key)).rejects.toThrow(
        /Decryption failed/
      );
    });

    it('should fail with tampered IV', async () => {
      const key = await generateKey();
      const message = 'Secret message';

      const encrypted = await encrypt(message, key);

      // Tamper with IV
      encrypted.iv[0] = encrypted.iv[0]! ^ 0xff;

      await expect(decrypt(encrypted, key)).rejects.toThrow(
        /Decryption failed/
      );
    });
  });

  describe('Key Import/Export', () => {
    it('should export and import key', async () => {
      const key = await generateKey();
      const message = 'Test message';

      const exported = await exportKey(key);
      const imported = await importKey(exported);

      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, imported);

      expect(decrypted).toBe(message);
    });

    it('should export and import key as base64', async () => {
      const key = await generateKey();
      const message = 'Test message';

      const base64 = await exportKeyBase64(key);
      const imported = await importKeyBase64(base64);

      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, imported);

      expect(decrypted).toBe(message);
      expect(typeof base64).toBe('string');
    });

    it('should export key as 32 bytes', async () => {
      const key = await generateKey();
      const exported = await exportKey(key);

      expect(exported.length).toBe(32); // 256 bits
    });
  });

  describe('Password-Based Key Derivation', () => {
    it('should derive key from password', async () => {
      const password = 'super-secure-password';
      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key = await deriveKeyFromPassword(password, salt);

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
    });

    it('should produce same key for same password and salt', async () => {
      const password = 'password123';
      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key1 = await deriveKeyFromPassword(password, salt);
      const key2 = await deriveKeyFromPassword(password, salt);

      const key1Bytes = await exportKey(key1);
      const key2Bytes = await exportKey(key2);

      expect(key1Bytes).toEqual(key2Bytes);
    });

    it('should produce different keys for different passwords', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));

      const key1 = await deriveKeyFromPassword('password1', salt);
      const key2 = await deriveKeyFromPassword('password2', salt);

      const key1Bytes = await exportKey(key1);
      const key2Bytes = await exportKey(key2);

      expect(key1Bytes).not.toEqual(key2Bytes);
    });

    it('should produce different keys for different salts', async () => {
      const password = 'password';
      const salt1 = crypto.getRandomValues(new Uint8Array(16));
      const salt2 = crypto.getRandomValues(new Uint8Array(16));

      const key1 = await deriveKeyFromPassword(password, salt1);
      const key2 = await deriveKeyFromPassword(password, salt2);

      const key1Bytes = await exportKey(key1);
      const key2Bytes = await exportKey(key2);

      expect(key1Bytes).not.toEqual(key2Bytes);
    });

    it('should work with derived key', async () => {
      const password = 'secure-password';
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const message = 'Encrypted with derived key';

      const key = await deriveKeyFromPassword(password, salt);
      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, key);

      expect(decrypted).toBe(message);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      const key = await generateKey();
      const message = '';

      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, key);

      expect(decrypted).toBe(message);
    });

    it('should handle large data (1MB)', async () => {
      const key = await generateKey();
      const largeData = new Uint8Array(1024 * 1024); // 1MB

      // Fill in chunks (crypto.getRandomValues has 65536 byte limit)
      const chunkSize = 65536;
      for (let i = 0; i < largeData.length; i += chunkSize) {
        const chunk = largeData.subarray(
          i,
          Math.min(i + chunkSize, largeData.length)
        );
        crypto.getRandomValues(chunk);
      }

      const startTime = Date.now();
      const encrypted = await encrypt(largeData, key);
      const decrypted = await decrypt(encrypted, key);
      const elapsed = Date.now() - startTime;

      expect(decrypted).toEqual(largeData);
      expect(elapsed).toBeLessThan(1000); // Should be < 1s
      console.log(`AES-GCM 1MB encrypt+decrypt: ${elapsed}ms`);
    });

    it('should handle Unicode characters', async () => {
      const key = await generateKey();
      const message = 'Hello 🌍 世界 مرحبا';

      const encrypted = await encrypt(message, key);
      const decrypted = await decryptString(encrypted, key);

      expect(decrypted).toBe(message);
    });

    it('should handle binary data with all byte values', async () => {
      const key = await generateKey();
      const data = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        data[i] = i;
      }

      const encrypted = await encrypt(data, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(data);
    });
  });

  describe('Performance', () => {
    it('should encrypt quickly', async () => {
      const key = await generateKey();
      const message = 'Performance test message';
      const iterations = 100;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await encrypt(message, key);
      }
      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`AES-GCM encrypt: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(5);
    });

    it('should decrypt quickly', async () => {
      const key = await generateKey();
      const message = 'Performance test message';
      const encrypted = await encrypt(message, key);
      const iterations = 100;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await decrypt(encrypted, key);
      }
      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`AES-GCM decrypt: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(5);
    });
  });
});
