import { describe, it, expect } from 'vitest';
import {
  // Ed25519
  generateKeyPair,
  sign,
  verify,
  // AES
  generateKey,
  encrypt,
  decryptString,
  exportKey,
  importKey,
  // Argon2
  deriveKey,
  generateSalt,
  verifyPassword,
  // Mnemonic
  generateMnemonic,
  mnemonicToSeed,
  deriveKeyPair,
  recoverFromMnemonic,
} from '../../../src/crypto';

describe('Crypto Integration', () => {
  describe('Complete Encryption Flow', () => {
    it('should encrypt and decrypt with mnemonic-derived key', async () => {
      // 1. Generate mnemonic
      const mnemonic = generateMnemonic();

      // 2. Derive encryption key from mnemonic
      const seed = await mnemonicToSeed(mnemonic);
      const derived = deriveKeyPair(seed, "m/44'/0'/0'/0/0");

      // 3. Use derived key to create AES key
      const salt = generateSalt();
      const password = Buffer.from(derived.privateKey).toString('hex');
      const keyMaterial = deriveKey(password, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });

      // 4. Import as AES key
      const aesKey = await importKey(keyMaterial);

      // 5. Encrypt data
      const message = 'Secret message from integration test';
      const encrypted = await encrypt(message, aesKey);

      // 6. Decrypt data
      const decrypted = await decryptString(encrypted, aesKey);

      expect(decrypted).toBe(message);
    });

    it('should complete recovery flow', async () => {
      const message = 'Data to encrypt';

      // Step 1: Create account with Ed25519 keys
      const signingKey = await generateKeyPair();

      // Step 2: Generate mnemonic for backup
      const mnemonic = generateMnemonic();

      // Step 3: Encrypt data
      const encryptionKey = await generateKey();
      const encrypted = await encrypt(message, encryptionKey);

      // Step 4: Sign encrypted data
      const signature = await sign(encrypted.ciphertext, signingKey.privateKey);

      // Step 5: Verify signature
      const isValid = await verify(
        signature,
        encrypted.ciphertext,
        signingKey.publicKey
      );

      // Step 6: Decrypt
      const decrypted = await decryptString(encrypted, encryptionKey);

      expect(isValid).toBe(true);
      expect(decrypted).toBe(message);
    });
  });

  describe('Key Recovery Flow', () => {
    it('should recover BIP32 keys from mnemonic', async () => {
      // Create account
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);
      const originalKey = deriveKeyPair(seed, "m/44'/0'/0'/0/0");

      // Recover from mnemonic
      const recoveredKey = await recoverFromMnemonic(mnemonic);

      // Verify keys match
      expect(recoveredKey.publicKey).toEqual(originalKey.publicKey);
      expect(recoveredKey.privateKey).toEqual(originalKey.privateKey);
    });
  });

  describe('Multi-User Scenario', () => {
    it('should handle encryption between two users', async () => {
      // User A setup
      const keyPairA = await generateKeyPair();

      // User B setup
      const keyPairB = await generateKeyPair();

      // User A creates and encrypts a message
      const message = 'Hello from User A';
      const aesKey = await generateKey();
      const encrypted = await encrypt(message, aesKey);

      // User A signs the encrypted message
      const signature = await sign(encrypted.ciphertext, keyPairA.privateKey);

      // User B verifies signature
      const isValid = await verify(
        signature,
        encrypted.ciphertext,
        keyPairA.publicKey
      );

      // User B decrypts (assuming key was shared securely)
      const decrypted = await decryptString(encrypted, aesKey);

      expect(isValid).toBe(true);
      expect(decrypted).toBe(message);
    });
  });

  describe('Password-Based Encryption', () => {
    it('should encrypt with password and decrypt', async () => {
      const password = 'user-password-123';
      const message = 'Password-protected message';

      // Derive key from password
      const salt = generateSalt();
      const keyMaterial = deriveKey(password, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });

      // Convert to AES key
      const aesKey = await importKey(keyMaterial);

      // Encrypt
      const encrypted = await encrypt(message, aesKey);

      // Decrypt with same password
      const derivedAgain = deriveKey(password, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });
      const aesKeyAgain = await importKey(derivedAgain);
      const decrypted = await decryptString(encrypted, aesKeyAgain);

      expect(decrypted).toBe(message);

      // Verify password
      const isValidPassword = verifyPassword(password, salt, keyMaterial, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });
      expect(isValidPassword).toBe(true);
    });

    it('should fail with wrong password', async () => {
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      const message = 'Secret data';

      // Encrypt with correct password
      const salt = generateSalt();
      const keyMaterial = deriveKey(correctPassword, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });
      const aesKey = await importKey(keyMaterial);
      const encrypted = await encrypt(message, aesKey);

      // Try to decrypt with wrong password
      const wrongKeyMaterial = deriveKey(wrongPassword, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });
      const wrongAesKey = await importKey(wrongKeyMaterial);

      await expect(decryptString(encrypted, wrongAesKey)).rejects.toThrow(
        /Decryption failed/
      );
    });
  });

  describe('Complete User Registration Flow', () => {
    it('should simulate full user registration', async () => {
      // 1. Generate mnemonic for user
      const mnemonic = generateMnemonic();

      // 2. User enters password
      const password = 'user-chosen-password';

      // 3. Generate Ed25519 signing key
      const signingKey = await generateKeyPair();

      // 4. Encrypt mnemonic with password
      const salt = generateSalt();
      const passwordKey = deriveKey(password, salt, {
        memoryCost: 1024,
        timeCost: 1,
        parallelism: 1,
      });
      const aesKey = await importKey(passwordKey);
      const encryptedMnemonic = await encrypt(mnemonic, aesKey);

      // 5. User signs a test message
      const testMessage = 'Account created';
      const signature = await sign(testMessage, signingKey.privateKey);

      // 6. Verify signature
      const isValid = await verify(
        signature,
        testMessage,
        signingKey.publicKey
      );

      // 7. Simulate login: decrypt mnemonic
      const decryptedMnemonic = await decryptString(encryptedMnemonic, aesKey);

      // 8. Derive BIP32 keys from recovered mnemonic
      const recoveredSeed = await mnemonicToSeed(decryptedMnemonic);
      const recoveredBIP32Key = deriveKeyPair(
        recoveredSeed,
        "m/44'/0'/0'/0/0"
      );

      // Verify everything matches
      expect(isValid).toBe(true);
      expect(decryptedMnemonic).toBe(mnemonic);
      expect(recoveredBIP32Key.publicKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Key Export and Import', () => {
    it('should export and import keys across modules', async () => {
      // Generate keys
      const signingKeyPair = await generateKeyPair();
      const encryptionKey = await generateKey();

      // Export
      const exportedEncKey = await exportKey(encryptionKey);

      // Import
      const importedEncKey = await importKey(exportedEncKey);

      // Test that imported key works
      const message = 'Test message';
      const encrypted = await encrypt(message, importedEncKey);
      const decrypted = await decryptString(encrypted, encryptionKey);

      expect(decrypted).toBe(message);
    });
  });
});
