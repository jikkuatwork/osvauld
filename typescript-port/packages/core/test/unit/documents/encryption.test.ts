import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptDocument,
  decryptDocument,
  encryptKeyForUser,
  decryptKeyForUser,
  reEncryptDocument,
  verifyDocumentIntegrity,
} from '../../../src/documents/encryption';
import { generateKeyPair as generateEd25519KeyPair } from '../../../src/crypto/ed25519';

describe('Document Encryption', () => {
  let ownerKeyPair: Awaited<ReturnType<typeof generateEd25519KeyPair>>;
  let recipientKeyPair: Awaited<ReturnType<typeof generateEd25519KeyPair>>;
  const ownerId = 'owner-123';
  const recipientId = 'recipient-456';
  const docId = 'doc-789';

  beforeEach(async () => {
    ownerKeyPair = await generateEd25519KeyPair();
    recipientKeyPair = await generateEd25519KeyPair();
  });

  describe('encryptDocument', () => {
    it('should encrypt document content', async () => {
      const content = 'This is a secret document';

      const result = await encryptDocument(content, ownerId, docId, ownerKeyPair);

      expect(result.encrypted).toBeDefined();
      expect(result.encrypted.content.ciphertext).toBeInstanceOf(Uint8Array);
      expect(result.encrypted.content.iv).toBeInstanceOf(Uint8Array);
      expect(result.encrypted.signature).toBeInstanceOf(Uint8Array);
      expect(result.encrypted.metadata.docId).toBe(docId);
      expect(result.encrypted.metadata.ownerId).toBe(ownerId);
      expect(result.documentKey).toBeDefined();
    });

    it('should produce different ciphertext for same content', async () => {
      const content = 'Same content';

      const result1 = await encryptDocument(content, ownerId, docId, ownerKeyPair);
      const result2 = await encryptDocument(content, ownerId, docId, ownerKeyPair);

      // Different IVs and ciphertexts
      expect(result1.encrypted.content.iv).not.toEqual(result2.encrypted.content.iv);
      expect(result1.encrypted.content.ciphertext).not.toEqual(
        result2.encrypted.content.ciphertext
      );
    });
  });

  describe('decryptDocument', () => {
    it('should decrypt encrypted document', async () => {
      const content = 'Secret content to decrypt';

      const { encrypted, documentKey } = await encryptDocument(
        content,
        ownerId,
        docId,
        ownerKeyPair
      );

      const decrypted = await decryptDocument(
        encrypted,
        documentKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(content);
    });

    it('should fail with wrong public key', async () => {
      const content = 'Secret content';
      const wrongKeyPair = await generateEd25519KeyPair();

      const { encrypted, documentKey } = await encryptDocument(
        content,
        ownerId,
        docId,
        ownerKeyPair
      );

      await expect(
        decryptDocument(encrypted, documentKey, wrongKeyPair.publicKey)
      ).rejects.toThrow('Invalid document signature');
    });

    it('should handle large documents', async () => {
      const largeContent = 'a'.repeat(1024 * 100); // 100KB

      const { encrypted, documentKey } = await encryptDocument(
        largeContent,
        ownerId,
        docId,
        ownerKeyPair
      );

      const decrypted = await decryptDocument(
        encrypted,
        documentKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(largeContent);
    });

    it('should handle Unicode content', async () => {
      const unicodeContent = '你好世界 🌍 مرحبا بالعالم';

      const { encrypted, documentKey } = await encryptDocument(
        unicodeContent,
        ownerId,
        docId,
        ownerKeyPair
      );

      const decrypted = await decryptDocument(
        encrypted,
        documentKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(unicodeContent);
    });
  });

  describe('encryptKeyForUser', () => {
    it('should encrypt document key for another user', async () => {
      const { documentKey } = await encryptDocument(
        'Test content',
        ownerId,
        docId,
        ownerKeyPair
      );

      const encryptedKeyData = await encryptKeyForUser(
        documentKey,
        recipientId,
        docId,
        ownerKeyPair
      );

      expect(encryptedKeyData.userId).toBe(recipientId);
      expect(encryptedKeyData.docId).toBe(docId);
      expect(encryptedKeyData.encryptedKey.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encryptedKeyData.signature).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decryptKeyForUser', () => {
    it('should decrypt shared document key', async () => {
      const content = 'Shared content';

      const { encrypted, documentKey } = await encryptDocument(
        content,
        ownerId,
        docId,
        ownerKeyPair
      );

      const encryptedKeyData = await encryptKeyForUser(
        documentKey,
        recipientId,
        docId,
        ownerKeyPair
      );

      const decryptedKey = await decryptKeyForUser(
        encryptedKeyData,
        recipientKeyPair,
        ownerKeyPair.publicKey
      );

      // Verify we can decrypt the document with the shared key
      const decrypted = await decryptDocument(
        encrypted,
        decryptedKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(content);
    });

    it('should fail with wrong sharer public key', async () => {
      const wrongKeyPair = await generateEd25519KeyPair();
      const { documentKey } = await encryptDocument(
        'Test',
        ownerId,
        docId,
        ownerKeyPair
      );

      const encryptedKeyData = await encryptKeyForUser(
        documentKey,
        recipientId,
        docId,
        ownerKeyPair
      );

      await expect(
        decryptKeyForUser(encryptedKeyData, recipientKeyPair, wrongKeyPair.publicKey)
      ).rejects.toThrow('Invalid key share signature');
    });
  });

  describe('reEncryptDocument', () => {
    it('should update document content', async () => {
      const originalContent = 'Original content';
      const updatedContent = 'Updated content';

      const { encrypted, documentKey } = await encryptDocument(
        originalContent,
        ownerId,
        docId,
        ownerKeyPair
      );

      const reEncrypted = await reEncryptDocument(
        updatedContent,
        encrypted,
        documentKey,
        ownerKeyPair
      );

      const decrypted = await decryptDocument(
        reEncrypted,
        documentKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(updatedContent);
      expect(reEncrypted.metadata.updatedAt.getTime()).toBeGreaterThan(
        encrypted.metadata.createdAt.getTime()
      );
    });

    it('should preserve metadata except updatedAt', async () => {
      const { encrypted, documentKey } = await encryptDocument(
        'Original',
        ownerId,
        docId,
        ownerKeyPair
      );

      const reEncrypted = await reEncryptDocument(
        'Updated',
        encrypted,
        documentKey,
        ownerKeyPair
      );

      expect(reEncrypted.metadata.docId).toBe(encrypted.metadata.docId);
      expect(reEncrypted.metadata.ownerId).toBe(encrypted.metadata.ownerId);
      expect(reEncrypted.metadata.createdAt).toEqual(encrypted.metadata.createdAt);
    });
  });

  describe('verifyDocumentIntegrity', () => {
    it('should verify valid document signature', async () => {
      const { encrypted } = await encryptDocument(
        'Test content',
        ownerId,
        docId,
        ownerKeyPair
      );

      const isValid = await verifyDocumentIntegrity(encrypted, ownerKeyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject tampered content', async () => {
      const { encrypted } = await encryptDocument(
        'Test content',
        ownerId,
        docId,
        ownerKeyPair
      );

      // Tamper with ciphertext
      encrypted.content.ciphertext[0] ^= 0xff;

      const isValid = await verifyDocumentIntegrity(encrypted, ownerKeyPair.publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject wrong public key', async () => {
      const wrongKeyPair = await generateEd25519KeyPair();
      const { encrypted } = await encryptDocument(
        'Test content',
        ownerId,
        docId,
        ownerKeyPair
      );

      const isValid = await verifyDocumentIntegrity(encrypted, wrongKeyPair.publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('encrypt → decrypt roundtrip', () => {
    it('should handle complete flow', async () => {
      const content = 'Complete flow test with encryption and decryption';

      const { encrypted, documentKey } = await encryptDocument(
        content,
        ownerId,
        docId,
        ownerKeyPair
      );

      const isValid = await verifyDocumentIntegrity(encrypted, ownerKeyPair.publicKey);
      expect(isValid).toBe(true);

      const decrypted = await decryptDocument(
        encrypted,
        documentKey,
        ownerKeyPair.publicKey
      );

      expect(decrypted).toBe(content);
    });
  });

  describe('performance', () => {
    it('should encrypt documents quickly', async () => {
      const content = 'Performance test document';
      const iterations = 10;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await encryptDocument(content, ownerId, docId, ownerKeyPair);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(50); // Should be < 50ms per encryption
    });

    it('should decrypt documents quickly', async () => {
      const content = 'Performance test document';
      const { encrypted, documentKey } = await encryptDocument(
        content,
        ownerId,
        docId,
        ownerKeyPair
      );

      const iterations = 10;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await decryptDocument(encrypted, documentKey, ownerKeyPair.publicKey);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(30); // Should be < 30ms per decryption
    });
  });
});
