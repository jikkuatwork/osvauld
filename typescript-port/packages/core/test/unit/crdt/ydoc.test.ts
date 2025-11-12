import { describe, it, expect, beforeEach } from 'vitest';
import {
  createYDoc,
  getYText,
  subscribeToUpdates,
  subscribeToTextChanges,
  insertText,
  deleteText,
  getText,
  setText,
  transact,
  destroyYDoc,
  getDocSize,
  clearDoc,
} from '../../../src/crdt/ydoc';

describe('Yjs Document Management', () => {
  describe('createYDoc', () => {
    it('should create a new Y.Doc', () => {
      const ydoc = createYDoc('doc-123');

      expect(ydoc).toBeDefined();
      expect(ydoc.clientID).toBeTypeOf('number');
    });

    it('should create unique client IDs', () => {
      const ydoc1 = createYDoc('doc-1');
      const ydoc2 = createYDoc('doc-2');

      expect(ydoc1.clientID).not.toBe(ydoc2.clientID);
    });
  });

  describe('getYText', () => {
    it('should get Y.Text instance', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      expect(ytext).toBeDefined();
      expect(ytext.length).toBe(0);
    });

    it('should get same instance for same field', () => {
      const ydoc = createYDoc('doc-1');
      const ytext1 = getYText(ydoc, 'content');
      const ytext2 = getYText(ydoc, 'content');

      expect(ytext1).toBe(ytext2);
    });

    it('should get different instances for different fields', () => {
      const ydoc = createYDoc('doc-1');
      const ytext1 = getYText(ydoc, 'content');
      const ytext2 = getYText(ydoc, 'title');

      expect(ytext1).not.toBe(ytext2);
    });
  });

  describe('insertText', () => {
    it('should insert text at position', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello');

      expect(getText(ytext)).toBe('Hello');
    });

    it('should insert text in middle', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello');
      insertText(ytext, 5, ' World');

      expect(getText(ytext)).toBe('Hello World');
    });

    it('should insert text at different positions', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'World');
      insertText(ytext, 0, 'Hello ');

      expect(getText(ytext)).toBe('Hello World');
    });
  });

  describe('deleteText', () => {
    it('should delete text range', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello World');
      deleteText(ytext, 5, 6); // Delete ' World'

      expect(getText(ytext)).toBe('Hello');
    });

    it('should delete from middle', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello Beautiful World');
      deleteText(ytext, 6, 10); // Delete 'Beautiful '

      expect(getText(ytext)).toBe('Hello World');
    });
  });

  describe('getText', () => {
    it('should get current text', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Test content');

      expect(getText(ytext)).toBe('Test content');
    });

    it('should return empty string for empty text', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      expect(getText(ytext)).toBe('');
    });
  });

  describe('setText', () => {
    it('should set entire text content', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      setText(ytext, 'New content');

      expect(getText(ytext)).toBe('New content');
    });

    it('should replace existing content', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      setText(ytext, 'Old content');
      setText(ytext, 'New content');

      expect(getText(ytext)).toBe('New content');
    });

    it('should handle empty string', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      setText(ytext, 'Some content');
      setText(ytext, '');

      expect(getText(ytext)).toBe('');
    });
  });

  describe('subscribeToUpdates', () => {
    it('should receive updates on changes', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);
      const updates: Uint8Array[] = [];

      const unsubscribe = subscribeToUpdates(ydoc, (update) => {
        updates.push(update);
      });

      insertText(ytext, 0, 'Hello');

      expect(updates.length).toBe(1);
      expect(updates[0]).toBeInstanceOf(Uint8Array);

      unsubscribe();
    });

    it('should not receive updates after unsubscribe', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);
      let updateCount = 0;

      const unsubscribe = subscribeToUpdates(ydoc, () => {
        updateCount++;
      });

      insertText(ytext, 0, 'Hello');
      expect(updateCount).toBe(1);

      unsubscribe();

      insertText(ytext, 5, ' World');
      expect(updateCount).toBe(1); // Should not increment
    });
  });

  describe('subscribeToTextChanges', () => {
    it('should receive text change events', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);
      let changeCount = 0;

      const unsubscribe = subscribeToTextChanges(ytext, () => {
        changeCount++;
      });

      insertText(ytext, 0, 'Hello');

      expect(changeCount).toBe(1);

      unsubscribe();
    });

    it('should not receive events after unsubscribe', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);
      let changeCount = 0;

      const unsubscribe = subscribeToTextChanges(ytext, () => {
        changeCount++;
      });

      insertText(ytext, 0, 'Hello');
      expect(changeCount).toBe(1);

      unsubscribe();

      insertText(ytext, 5, ' World');
      expect(changeCount).toBe(1);
    });
  });

  describe('transact', () => {
    it('should batch operations in transaction', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);
      let updateCount = 0;

      subscribeToUpdates(ydoc, () => {
        updateCount++;
      });

      transact(ydoc, () => {
        insertText(ytext, 0, 'Hello');
        insertText(ytext, 5, ' World');
        insertText(ytext, 11, '!');
      });

      expect(getText(ytext)).toBe('Hello World!');
      expect(updateCount).toBe(1); // Only one update for transaction
    });
  });

  describe('getDocSize', () => {
    it('should return document size', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const emptySize = getDocSize(ydoc);
      expect(emptySize).toBeGreaterThan(0);

      insertText(ytext, 0, 'Some content');

      const contentSize = getDocSize(ydoc);
      expect(contentSize).toBeGreaterThan(emptySize);
    });
  });

  describe('clearDoc', () => {
    it('should clear all content', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc, 'content');

      insertText(ytext, 0, 'Test content');
      expect(getText(ytext)).toBe('Test content');

      clearDoc(ydoc);

      expect(getText(ytext)).toBe('');
    });
  });

  describe('destroyYDoc', () => {
    it('should destroy document', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Test');

      destroyYDoc(ydoc);

      expect(() => getText(ytext)).not.toThrow();
      // After destroy, doc is in unusable state but doesn't throw
    });
  });

  describe('concurrent edits', () => {
    it('should handle concurrent insertions', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello');
      insertText(ytext, 5, ' World');
      insertText(ytext, 0, 'Oh ');

      expect(getText(ytext)).toBe('Oh Hello World');
    });

    it('should handle interleaved operations', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'ABCDEF');
      deleteText(ytext, 2, 2); // Delete CD
      insertText(ytext, 2, 'XY');

      expect(getText(ytext)).toBe('ABXYEF');
    });
  });

  describe('Unicode support', () => {
    it('should handle Unicode characters', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      const unicodeText = '你好世界 🌍 مرحبا بالعالم';
      setText(ytext, unicodeText);

      expect(getText(ytext)).toBe(unicodeText);
    });

    it('should handle emoji', () => {
      const ydoc = createYDoc('doc-1');
      const ytext = getYText(ydoc);

      insertText(ytext, 0, 'Hello 👋 World 🌍');

      expect(getText(ytext)).toBe('Hello 👋 World 🌍');
    });
  });
});
