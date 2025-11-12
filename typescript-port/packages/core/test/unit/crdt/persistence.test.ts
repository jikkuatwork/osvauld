import { describe, it, expect } from 'vitest';
import { generateKey } from '../../../src/crypto/aes';
import {
  saveDocumentState,
  loadDocumentState,
  encryptYDocUpdates,
  decryptYDocUpdates,
  saveEncryptedState,
  loadEncryptedState,
  serializeSavedState,
  deserializeSavedState,
  serializeEncryptedState,
  deserializeEncryptedState,
  getIncrementalUpdates,
  applyIncrementalUpdate,
  compactDocumentState,
  getStateSize,
  validateSavedState,
} from '../../../src/crdt/persistence';
import { createYDoc, getYText, insertText, getText } from '../../../src/crdt/ydoc';
import { getStateVector } from '../../../src/crdt/sync';

describe('CRDT Persistence', () => {
  describe('saveDocumentState and loadDocumentState', () => {
    it('should save and load document state', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Persistent content');

      const saved = saveDocumentState(ydoc, 'doc-1');

      expect(saved.docId).toBe('doc-1');
      expect(saved.state).toBeInstanceOf(Uint8Array);
      expect(saved.timestamp).toBeInstanceOf(Date);
      expect(saved.version).toBe(1);

      const loaded = loadDocumentState(saved);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe('Persistent content');
    });

    it('should preserve complex content', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Line 1\\nLine 2\\nLine 3');
      insertText(ytext, 6, ' Modified');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const loaded = loadDocumentState(saved);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe(getText(ytext));
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt updates', async () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Secret content');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const key = await generateKey();

      const encrypted = await encryptYDocUpdates(saved.state, key);

      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);

      const decrypted = await decryptYDocUpdates(encrypted, key);

      expect(decrypted).toEqual(saved.state);
    });

    it('should fail with wrong key', async () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Secret content');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const key1 = await generateKey();
      const key2 = await generateKey();

      const encrypted = await encryptYDocUpdates(saved.state, key1);

      await expect(decryptYDocUpdates(encrypted, key2)).rejects.toThrow();
    });
  });

  describe('saveEncryptedState and loadEncryptedState', () => {
    it('should save and load encrypted state', async () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Encrypted persistent content');

      const key = await generateKey();
      const saved = await saveEncryptedState(ydoc, 'doc-1', key);

      expect(saved.docId).toBe('doc-1');
      expect(saved.encryptedState.ciphertext).toBeInstanceOf(Uint8Array);

      const loaded = await loadEncryptedState(saved, key);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe('Encrypted persistent content');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize saved state', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Serialized content');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const serialized = serializeSavedState(saved);

      expect(typeof serialized).toBe('string');

      const deserialized = deserializeSavedState(serialized);

      expect(deserialized.docId).toBe(saved.docId);
      expect(deserialized.version).toBe(saved.version);

      const loaded = loadDocumentState(deserialized);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe('Serialized content');
    });

    it('should serialize and deserialize encrypted state', async () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Encrypted serialized content');

      const key = await generateKey();
      const saved = await saveEncryptedState(ydoc, 'doc-1', key);
      const serialized = serializeEncryptedState(saved);

      expect(typeof serialized).toBe('string');

      const deserialized = deserializeEncryptedState(serialized);

      expect(deserialized.docId).toBe(saved.docId);

      const loaded = await loadEncryptedState(deserialized, key);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe('Encrypted serialized content');
    });
  });

  describe('incremental updates', () => {
    it('should get incremental updates', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Initial content');

      const stateVector = getStateVector(ydoc);

      insertText(ytext, 15, ' - Updated');

      const incrementalUpdates = getIncrementalUpdates(ydoc, stateVector);

      expect(incrementalUpdates).toBeInstanceOf(Uint8Array);
      expect(incrementalUpdates.byteLength).toBeGreaterThan(0);
    });

    it('should apply incremental update to saved state', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Initial content');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const stateVector = getStateVector(ydoc);

      insertText(ytext, 15, ' - Updated');

      const incrementalUpdate = getIncrementalUpdates(ydoc, stateVector);
      const updatedSaved = applyIncrementalUpdate(saved, incrementalUpdate);

      const loaded = loadDocumentState(updatedSaved);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe('Initial content - Updated');
    });
  });

  describe('compactDocumentState', () => {
    it('should compact document state', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      // Create and delete content
      insertText(ytext, 0, 'Temporary content that will be deleted');
      insertText(ytext, 0, 'Final content ');

      const saved = saveDocumentState(ydoc, 'doc-1');
      const originalSize = getStateSize(saved);

      const compacted = compactDocumentState(saved);

      const loaded = loadDocumentState(compacted);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe(getText(ytext));
      // Compacted size should be similar or smaller
      expect(getStateSize(compacted)).toBeLessThanOrEqual(originalSize * 1.1);
    });
  });

  describe('getStateSize', () => {
    it('should get state size', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const emptySaved = saveDocumentState(ydoc, 'doc-1');
      const emptySize = getStateSize(emptySaved);

      insertText(ytext, 0, 'Some content');

      const contentSaved = saveDocumentState(ydoc, 'doc-1');
      const contentSize = getStateSize(contentSaved);

      expect(contentSize).toBeGreaterThan(emptySize);
    });
  });

  describe('validateSavedState', () => {
    it('should validate correct state', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Valid content');

      const saved = saveDocumentState(ydoc, 'doc-1');

      expect(validateSavedState(saved)).toBe(true);
    });

    it('should reject invalid state', () => {
      const invalid = {
        docId: 'doc-1',
        state: new Uint8Array([1, 2, 3, 4, 5]),
        timestamp: new Date(),
        version: 1,
      };

      expect(validateSavedState(invalid)).toBe(false);
    });
  });

  describe('persistence → load → same state', () => {
    it('should maintain state across save/load cycle', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const originalContent = 'Complete persistence test with Unicode 你好 🌍';
      insertText(ytext, 0, originalContent);

      const saved = saveDocumentState(ydoc, 'doc-1');
      const serialized = serializeSavedState(saved);
      const deserialized = deserializeSavedState(serialized);
      const loaded = loadDocumentState(deserialized);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe(originalContent);
    });

    it('should maintain state with encryption', async () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const originalContent = 'Encrypted persistence test';
      insertText(ytext, 0, originalContent);

      const key = await generateKey();
      const saved = await saveEncryptedState(ydoc, 'doc-1', key);
      const serialized = serializeEncryptedState(saved);
      const deserialized = deserializeEncryptedState(serialized);
      const loaded = await loadEncryptedState(deserialized, key);
      const loadedText = getYText(loaded);

      expect(getText(loadedText)).toBe(originalContent);
    });
  });

  describe('performance', () => {
    it('should handle large documents efficiently', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const largeContent = 'x'.repeat(10000);
      insertText(ytext, 0, largeContent);

      const start = performance.now();
      const saved = saveDocumentState(ydoc, 'doc-1');
      const loaded = loadDocumentState(saved);
      const loadedText = getYText(loaded);
      const end = performance.now();

      expect(getText(loadedText)).toBe(largeContent);
      expect(end - start).toBeLessThan(500); // Should be fast
    });
  });
});
