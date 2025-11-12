import { describe, it, expect, beforeEach } from 'vitest';
import { SearchIndexer, toIndexedDocument } from '../../../src/search/indexer';
import type { Document } from '../../../src/types/document';

describe('Search Indexer', () => {
  let indexer: SearchIndexer;

  beforeEach(() => {
    indexer = new SearchIndexer();
  });

  const createMockDoc = (id: string, title: string, content: string, tags: string[] = []): any => ({
    id,
    title,
    content,
    tags,
    ownerId: 'user-1',
  });

  describe('addDocument', () => {
    it('should add document to index', () => {
      const doc = createMockDoc('doc-1', 'Test Document', 'This is test content');

      indexer.addDocument(doc);

      const results = indexer.search('test');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should index multiple fields', () => {
      const doc = createMockDoc('doc-1', 'TypeScript Guide', 'Learn TypeScript basics');

      indexer.addDocument(doc);

      const titleResults = indexer.search('TypeScript');
      const contentResults = indexer.search('basics');

      expect(titleResults.length).toBeGreaterThan(0);
      expect(contentResults.length).toBeGreaterThan(0);
    });
  });

  describe('removeDocument', () => {
    it('should remove document from index', () => {
      const doc = createMockDoc('doc-1', 'Test Document', 'Content');

      indexer.addDocument(doc);
      expect(indexer.search('test').length).toBeGreaterThan(0);

      indexer.removeDocument('doc-1');
      expect(indexer.search('test').length).toBe(0);
    });
  });

  describe('updateDocument', () => {
    it('should update document in index', () => {
      const doc1 = createMockDoc('doc-1', 'Old Title', 'Old content');
      const doc2 = createMockDoc('doc-1', 'New Title', 'New content');

      indexer.addDocument(doc1);
      indexer.updateDocument(doc2);

      const oldResults = indexer.search('Old');
      const newResults = indexer.search('New');

      expect(oldResults.length).toBe(0);
      expect(newResults.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      indexer.addDocument(createMockDoc('1', 'JavaScript Basics', 'Learn JavaScript fundamentals'));
      indexer.addDocument(createMockDoc('2', 'TypeScript Guide', 'TypeScript for beginners'));
      indexer.addDocument(createMockDoc('3', 'Python Tutorial', 'Python programming basics'));
    });

    it('should find documents by query', () => {
      const results = indexer.search('JavaScript');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toContain('JavaScript');
    });

    it('should return empty array for empty query', () => {
      const results = indexer.search('');

      expect(results).toEqual([]);
    });

    it('should rank results by relevance', () => {
      const results = indexer.search('TypeScript');

      expect(results[0]?.title).toBe('TypeScript Guide');
    });

    it('should find partial matches', () => {
      const results = indexer.search('type'); // Matches "TypeScript" as prefix

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.title).toContain('TypeScript');
    });
  });

  describe('searchWithFilters', () => {
    beforeEach(() => {
      indexer.addDocument({
        id: '1',
        title: 'Doc 1',
        content: 'Content',
        tags: ['javascript', 'tutorial'],
        ownerId: 'user-1',
        folderId: 'folder-1',
      });
      indexer.addDocument({
        id: '2',
        title: 'Doc 2',
        content: 'Content',
        tags: ['typescript'],
        ownerId: 'user-2',
        folderId: 'folder-1',
      });
      indexer.addDocument({
        id: '3',
        title: 'Doc 3',
        content: 'Content',
        tags: ['python'],
        ownerId: 'user-1',
        folderId: 'folder-2',
      });
    });

    it('should filter by owner', () => {
      const results = indexer.searchWithFilters('Doc', { ownerId: 'user-1' });

      expect(results.length).toBe(2);
      expect(results.map((r) => r.id)).toEqual(['1', '3']);
    });

    it('should filter by folder', () => {
      const results = indexer.searchWithFilters('Doc', { folderId: 'folder-1' });

      expect(results.length).toBe(2);
    });

    it('should filter by tags', () => {
      const results = indexer.searchWithFilters('Doc', { tags: ['javascript'] });

      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe('1');
    });
  });

  describe('searchByTags', () => {
    beforeEach(() => {
      indexer.addDocument(createMockDoc('1', 'Doc 1', 'Content', ['javascript', 'tutorial']));
      indexer.addDocument(createMockDoc('2', 'Doc 2', 'Content', ['typescript', 'tutorial']));
      indexer.addDocument(createMockDoc('3', 'Doc 3', 'Content', ['python']));
    });

    it('should find documents by tag', () => {
      const results = indexer.searchByTags(['javascript']);

      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe('1');
    });

    it('should find documents by multiple tags', () => {
      const results = indexer.searchByTags(['tutorial']);

      expect(results.length).toBe(2);
    });
  });

  describe('fuzzySearch', () => {
    beforeEach(() => {
      indexer.addDocument(createMockDoc('1', 'JavaScript', 'Content'));
      indexer.addDocument(createMockDoc('2', 'TypeScript', 'Content'));
    });

    it('should find documents with typos', () => {
      const results = indexer.fuzzySearch('Javscript'); // Typo

      expect(results.length).toBeGreaterThan(0);
    });

    it('should find close matches', () => {
      const results = indexer.fuzzySearch('Typescript'); // Case difference

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all documents', () => {
      indexer.addDocument(createMockDoc('1', 'Doc 1', 'Content'));
      indexer.addDocument(createMockDoc('2', 'Doc 2', 'Content'));

      indexer.clear();

      const results = indexer.search('Doc');
      expect(results.length).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return index statistics', () => {
      indexer.addDocument(createMockDoc('1', 'Document One', 'Content'));
      indexer.addDocument(createMockDoc('2', 'Document Two', 'Content'));

      const stats = indexer.getStats();

      expect(stats.documentCount).toBe(2);
      expect(stats.termCount).toBeGreaterThan(0);
    });
  });

  describe('autoSuggest', () => {
    beforeEach(() => {
      indexer.addDocument(createMockDoc('1', 'JavaScript Basics', 'Content'));
      indexer.addDocument(createMockDoc('2', 'JavaScript Advanced', 'Content'));
      indexer.addDocument(createMockDoc('3', 'TypeScript Guide', 'Content'));
    });

    it('should suggest completions', () => {
      const suggestions = indexer.autoSuggest('Java');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('JavaScript');
    });

    it('should limit suggestions', () => {
      const suggestions = indexer.autoSuggest('a', 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('performance', () => {
    it('should index many documents quickly', () => {
      const docs = Array.from({ length: 100 }, (_, i) =>
        createMockDoc(`doc-${i}`, `Document ${i}`, `Content for document ${i}`)
      );

      const start = performance.now();
      indexer.addDocuments(docs);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should be fast
    });

    it('should search quickly', () => {
      const docs = Array.from({ length: 100 }, (_, i) =>
        createMockDoc(`doc-${i}`, `Document ${i}`, `Content for document ${i}`)
      );

      indexer.addDocuments(docs);

      const start = performance.now();
      indexer.search('Document');
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should be fast
    });
  });

  describe('toIndexedDocument', () => {
    it('should convert Document to IndexedDocument', () => {
      const doc: Document = {
        id: 'doc-1',
        title: 'Test',
        ownerId: 'user-1',
        folderId: 'folder-1',
        encryptedContent: 'encrypted',
        contentIV: 'iv',
        encryptedKey: 'key',
        keyIV: 'keyiv',
        signature: 'sig',
        tags: ['test'],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const indexed = toIndexedDocument(doc, 'decrypted content');

      expect(indexed.id).toBe('doc-1');
      expect(indexed.title).toBe('Test');
      expect(indexed.content).toBe('decrypted content');
      expect(indexed.tags).toEqual(['test']);
    });
  });
});
