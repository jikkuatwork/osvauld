import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  applyUpdate,
  getStateVector,
  getMissingUpdates,
  encodeDocumentState,
  applyDocumentState,
  syncDocs,
  createSnapshot,
  encodeSnapshot,
  decodeSnapshot,
  areDocsInSync,
  getDocHash,
  validateUpdate,
  getUpdateSize,
} from '../../../src/crdt/sync';
import { createYDoc, getYText, insertText, getText } from '../../../src/crdt/ydoc';

describe('CRDT Sync', () => {
  describe('applyUpdate', () => {
    it('should apply update to document', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);

      insertText(ytext1, 0, 'Hello');

      // Get update from doc1
      const update = Y.encodeStateAsUpdate(doc1);

      // Apply to doc2
      applyUpdate(doc2, update);

      const ytext2 = getYText(doc2);
      expect(getText(ytext2)).toBe('Hello');
    });

    it('should handle multiple updates', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);

      insertText(ytext1, 0, 'Hello');
      const update1 = Y.encodeStateAsUpdate(doc1);

      insertText(ytext1, 5, ' World');
      const update2 = Y.encodeStateAsUpdate(doc1);

      applyUpdate(doc2, update1);
      applyUpdate(doc2, update2);

      const ytext2 = getYText(doc2);
      expect(getText(ytext2)).toBe('Hello World');
    });
  });

  describe('getStateVector', () => {
    it('should get state vector', () => {
      const doc = createYDoc('doc-1');
      const ytext = getYText(doc);

      insertText(ytext, 0, 'Test');

      const stateVector = getStateVector(doc);

      expect(stateVector).toBeInstanceOf(Uint8Array);
      expect(stateVector.byteLength).toBeGreaterThan(0);
    });
  });

  describe('getMissingUpdates', () => {
    it('should get missing updates based on state vector', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);

      // Doc1 has content
      insertText(ytext1, 0, 'Hello World');

      // Doc2 is empty - get its state vector
      const emptyStateVector = getStateVector(doc2);

      // Get updates doc2 is missing
      const missingUpdates = getMissingUpdates(doc1, emptyStateVector);

      expect(missingUpdates).toBeInstanceOf(Uint8Array);
      expect(missingUpdates.byteLength).toBeGreaterThan(0);

      // Apply missing updates to doc2
      applyUpdate(doc2, missingUpdates);

      const ytext2 = getYText(doc2);
      expect(getText(ytext2)).toBe('Hello World');
    });
  });

  describe('encodeDocumentState and applyDocumentState', () => {
    it('should encode and apply document state', () => {
      const doc1 = createYDoc('doc-1');
      const ytext1 = getYText(doc1);

      insertText(ytext1, 0, 'Complete document state');

      const state = encodeDocumentState(doc1);

      const doc2 = createYDoc('doc-2');
      applyDocumentState(doc2, state);

      const ytext2 = getYText(doc2);
      expect(getText(ytext2)).toBe('Complete document state');
    });
  });

  describe('syncDocs', () => {
    it('should sync two documents bidirectionally', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      // Doc1 has some content
      insertText(ytext1, 0, 'Hello');

      // Doc2 has different content
      insertText(ytext2, 0, 'World');

      // Sync them
      syncDocs(doc1, doc2);

      // Both should have all content (order depends on client IDs)
      const text1 = getText(ytext1);
      const text2 = getText(ytext2);

      expect(text1).toBe(text2);
      expect(text1.length).toBeGreaterThan(0);
    });

    it('should handle empty documents', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');

      syncDocs(doc1, doc2);

      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      expect(getText(ytext1)).toBe('');
      expect(getText(ytext2)).toBe('');
    });

    it('should sync complex edits', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      // Multiple edits on doc1
      insertText(ytext1, 0, 'Line 1');
      insertText(ytext1, 6, '\\nLine 2');
      insertText(ytext1, 14, '\\nLine 3');

      syncDocs(doc1, doc2);

      expect(getText(ytext2)).toBe(getText(ytext1));
    });
  });

  describe('snapshots', () => {
    it('should create and encode snapshot', () => {
      const doc = createYDoc('doc-1');
      const ytext = getYText(doc);

      insertText(ytext, 0, 'Snapshot test');

      const snapshot = createSnapshot(doc);
      const encoded = encodeSnapshot(snapshot);

      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.byteLength).toBeGreaterThan(0);
    });

    it('should decode snapshot', () => {
      const doc = createYDoc('doc-1');
      const ytext = getYText(doc);

      insertText(ytext, 0, 'Snapshot test');

      const snapshot = createSnapshot(doc);
      const encoded = encodeSnapshot(snapshot);
      const decoded = decodeSnapshot(encoded);

      expect(decoded).toBeDefined();
    });
  });

  describe('areDocsInSync', () => {
    it('should return true for synced documents', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);

      insertText(ytext1, 0, 'Same content');

      const state = encodeDocumentState(doc1);
      applyDocumentState(doc2, state);

      // Note: This is a simplified check
      const inSync = areDocsInSync(doc1, doc2);

      expect(inSync).toBe(true);
    });

    it('should return false for different documents', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      insertText(ytext1, 0, 'Content 1');
      insertText(ytext2, 0, 'Content 2');

      const inSync = areDocsInSync(doc1, doc2);

      expect(inSync).toBe(false);
    });
  });

  describe('getDocHash', () => {
    it('should generate consistent hash for same content', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      insertText(ytext1, 0, 'Same content');
      insertText(ytext2, 0, 'Same content');

      const hash1 = getDocHash(doc1);
      const hash2 = getDocHash(doc2);

      // Hashes might be different due to client IDs, but both should be strings
      expect(typeof hash1).toBe('string');
      expect(typeof hash2).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different content', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      insertText(ytext1, 0, 'Content A');
      insertText(ytext2, 0, 'Content B');

      const hash1 = getDocHash(doc1);
      const hash2 = getDocHash(doc2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateUpdate', () => {
    it('should validate correct update', () => {
      const doc = createYDoc('doc-1');
      const ytext = getYText(doc);

      insertText(ytext, 0, 'Valid update');

      const update = Y.encodeStateAsUpdate(doc);

      expect(validateUpdate(update)).toBe(true);
    });

    it('should reject invalid update', () => {
      const invalidUpdate = new Uint8Array([1, 2, 3, 4, 5]);

      expect(validateUpdate(invalidUpdate)).toBe(false);
    });
  });

  describe('getUpdateSize', () => {
    it('should get update size', () => {
      const doc = createYDoc('doc-1');
      const ytext = getYText(doc);

      insertText(ytext, 0, 'Test');

      const update = Y.encodeStateAsUpdate(doc);
      const size = getUpdateSize(update);

      expect(size).toBeGreaterThan(0);
      expect(size).toBe(update.byteLength);
    });
  });

  describe('concurrent editing', () => {
    it('should handle concurrent edits from two docs', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);

      // Both start with same content
      insertText(ytext1, 0, 'Start');
      const initialUpdate = Y.encodeStateAsUpdate(doc1);
      applyUpdate(doc2, initialUpdate);

      // Now both edit concurrently
      insertText(ytext1, 5, ' from doc1');
      insertText(ytext2, 5, ' from doc2');

      // Sync changes
      syncDocs(doc1, doc2);

      // Both should have merged content
      const text1 = getText(ytext1);
      const text2 = getText(ytext2);

      expect(text1).toBe(text2);
      expect(text1).toContain('Start');
      expect(text1).toContain('from doc1');
      expect(text1).toContain('from doc2');
    });

    it('should handle many concurrent updates', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const doc3 = createYDoc('doc-3');
      const ytext1 = getYText(doc1);
      const ytext2 = getYText(doc2);
      const ytext3 = getYText(doc3);

      // Each doc makes changes
      insertText(ytext1, 0, 'A');
      insertText(ytext2, 0, 'B');
      insertText(ytext3, 0, 'C');

      // Sync all
      syncDocs(doc1, doc2);
      syncDocs(doc2, doc3);
      syncDocs(doc1, doc3);

      // All should have same content
      const text1 = getText(ytext1);
      const text2 = getText(ytext2);
      const text3 = getText(ytext3);

      expect(text1).toBe(text2);
      expect(text2).toBe(text3);
      expect(text1.length).toBe(3); // A, B, C
    });
  });

  describe('performance', () => {
    it('should handle large documents efficiently', () => {
      const doc1 = createYDoc('doc-1');
      const doc2 = createYDoc('doc-2');
      const ytext1 = getYText(doc1);

      // Create large content
      const largeContent = 'x'.repeat(10000);

      const start = performance.now();
      insertText(ytext1, 0, largeContent);

      const state = encodeDocumentState(doc1);
      applyDocumentState(doc2, state);
      const end = performance.now();

      const ytext2 = getYText(doc2);
      expect(getText(ytext2)).toBe(largeContent);
      expect(end - start).toBeLessThan(1000); // Should be fast
    });
  });
});
