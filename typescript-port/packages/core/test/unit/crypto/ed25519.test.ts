import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  sign,
  verify,
  publicKeyToHex,
  publicKeyFromHex,
  privateKeyToHex,
  privateKeyFromHex,
} from '../../../src/crypto/ed25519';

describe('Ed25519 Crypto', () => {
  describe('Key Generation', () => {
    it('should generate a key pair', async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.privateKey.length).toBe(32);
    });

    it('should generate unique key pairs', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });
  });

  describe('Signing', () => {
    it('should sign a string message', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Hello, World!';

      const signature = await sign(message, keyPair.privateKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should sign a Uint8Array message', async () => {
      const keyPair = await generateKeyPair();
      const message = new Uint8Array([1, 2, 3, 4, 5]);

      const signature = await sign(message, keyPair.privateKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);
    });

    it('should produce deterministic signatures', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Test message';

      const sig1 = await sign(message, keyPair.privateKey);
      const sig2 = await sign(message, keyPair.privateKey);

      expect(sig1).toEqual(sig2);
    });

    it('should produce different signatures for different messages', async () => {
      const keyPair = await generateKeyPair();

      const sig1 = await sign('Message 1', keyPair.privateKey);
      const sig2 = await sign('Message 2', keyPair.privateKey);

      expect(sig1).not.toEqual(sig2);
    });
  });

  describe('Verification', () => {
    it('should verify valid signatures', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Hello, World!';

      const signature = await sign(message, keyPair.privateKey);
      const isValid = await verify(signature, message, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Hello, World!';
      const signature = await sign(message, keyPair.privateKey);

      // Tamper with signature
      const tamperedSignature = new Uint8Array(signature);
      tamperedSignature[0] = tamperedSignature[0]! ^ 0xff;

      const isValid = await verify(
        tamperedSignature,
        message,
        keyPair.publicKey
      );

      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong message', async () => {
      const keyPair = await generateKeyPair();
      const signature = await sign('Original', keyPair.privateKey);

      const isValid = await verify(signature, 'Tampered', keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong public key', async () => {
      const keyPair1 = await generateKeyPair();
      const keyPair2 = await generateKeyPair();
      const message = 'Test';

      const signature = await sign(message, keyPair1.privateKey);
      const isValid = await verify(signature, message, keyPair2.publicKey);

      expect(isValid).toBe(false);
    });

    it('should work with Uint8Array messages', async () => {
      const keyPair = await generateKeyPair();
      const message = new Uint8Array([1, 2, 3, 4, 5]);

      const signature = await sign(message, keyPair.privateKey);
      const isValid = await verify(signature, message, keyPair.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Key Import/Export', () => {
    it('should export and import public key', async () => {
      const keyPair = await generateKeyPair();

      const hex = publicKeyToHex(keyPair.publicKey);
      const imported = publicKeyFromHex(hex);

      expect(imported).toEqual(keyPair.publicKey);
    });

    it('should export and import private key', async () => {
      const keyPair = await generateKeyPair();

      const hex = privateKeyToHex(keyPair.privateKey);
      const imported = privateKeyFromHex(hex);

      expect(imported).toEqual(keyPair.privateKey);
    });

    it('should work with exported keys', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Test message';

      // Export and re-import keys
      const privateKeyHex = privateKeyToHex(keyPair.privateKey);
      const publicKeyHex = publicKeyToHex(keyPair.publicKey);

      const privateKey = privateKeyFromHex(privateKeyHex);
      const publicKey = publicKeyFromHex(publicKeyHex);

      // Sign and verify with imported keys
      const signature = await sign(message, privateKey);
      const isValid = await verify(signature, message, publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', async () => {
      const keyPair = await generateKeyPair();
      const message = '';

      const signature = await sign(message, keyPair.privateKey);
      const isValid = await verify(signature, message, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should handle large messages', async () => {
      const keyPair = await generateKeyPair();
      const message = 'A'.repeat(1024 * 1024); // 1MB

      const startTime = Date.now();
      const signature = await sign(message, keyPair.privateKey);
      const signTime = Date.now() - startTime;

      const isValid = await verify(signature, message, keyPair.publicKey);

      expect(isValid).toBe(true);
      expect(signTime).toBeLessThan(1000); // Should be fast
    });

    it('should handle binary data', async () => {
      const keyPair = await generateKeyPair();
      const message = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        message[i] = i;
      }

      const signature = await sign(message, keyPair.privateKey);
      const isValid = await verify(signature, message, keyPair.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should sign messages quickly', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Performance test message';

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await sign(message, keyPair.privateKey);
      }

      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`Ed25519 sign: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(10); // Should be < 10ms
    });

    it('should verify signatures quickly', async () => {
      const keyPair = await generateKeyPair();
      const message = 'Performance test message';
      const signature = await sign(message, keyPair.privateKey);

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await verify(signature, message, keyPair.publicKey);
      }

      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`Ed25519 verify: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(10); // Should be < 10ms
    });
  });
});
