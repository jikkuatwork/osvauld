/**
 * Search Indexer
 *
 * Handles indexing and searching of documents using MiniSearch.
 */

import MiniSearch from 'minisearch';
import type { Document } from '../types/document';

/**
 * Indexed document for search
 */
export interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  ownerId: string;
  folderId?: string;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  title: string;
  score: number;
  match: Record<string, string[]>;
}

/**
 * Search options
 */
export interface SearchOptions {
  fuzzy?: number | boolean;
  prefix?: boolean;
  boost?: Record<string, number>;
  filter?: (doc: IndexedDocument) => boolean;
}

/**
 * Search indexer using MiniSearch
 */
export class SearchIndexer {
  private index: MiniSearch<IndexedDocument>;
  private documents: Map<string, IndexedDocument>;

  constructor() {
    this.documents = new Map();
    this.index = new MiniSearch({
      fields: ['title', 'content', 'tags'],
      storeFields: ['id', 'title', 'ownerId', 'folderId', 'tags'],
      searchOptions: {
        boost: { title: 2 },
        fuzzy: 0.2,
      },
    });
  }

  /**
   * Adds a document to the index
   */
  addDocument(doc: IndexedDocument): void {
    this.documents.set(doc.id, doc);
    this.index.add(doc);
  }

  /**
   * Adds multiple documents
   */
  addDocuments(docs: IndexedDocument[]): void {
    docs.forEach((doc) => this.documents.set(doc.id, doc));
    this.index.addAll(docs);
  }

  /**
   * Removes a document from the index
   */
  removeDocument(docId: string): void {
    this.documents.delete(docId);
    this.index.discard(docId);
  }

  /**
   * Updates a document in the index
   */
  updateDocument(doc: IndexedDocument): void {
    this.documents.set(doc.id, doc);
    this.index.discard(doc.id);
    this.index.add(doc);
  }

  /**
   * Searches documents
   */
  search(query: string, options?: SearchOptions): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchOptions = {
      fuzzy: options?.fuzzy !== undefined ? options.fuzzy : 0.2,
      prefix: options?.prefix !== undefined ? options.prefix : true,
      boost: options?.boost || { title: 2 },
    };

    const results = this.index.search(query, searchOptions);

    return results.map((result) => ({
      id: result.id,
      title: result.title,
      score: result.score,
      match: result.match,
    }));
  }

  /**
   * Searches with filters
   */
  searchWithFilters(
    query: string,
    filters: { ownerId?: string; folderId?: string; tags?: string[] },
    options?: SearchOptions
  ): SearchResult[] {
    const allResults = this.search(query, options);

    return allResults.filter((result) => {
      const doc = this.getDocument(result.id);
      if (!doc) return false;

      if (filters.ownerId && doc.ownerId !== filters.ownerId) {
        return false;
      }

      if (filters.folderId && doc.folderId !== filters.folderId) {
        return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some((tag) => doc.tags.includes(tag));
        if (!hasTag) return false;
      }

      return true;
    });
  }

  /**
   * Searches by tags
   */
  searchByTags(tags: string[]): SearchResult[] {
    const allDocs = this.getAllDocuments();

    const matches = allDocs.filter((doc) =>
      tags.some((tag) => doc.tags.includes(tag))
    );

    return matches.map((doc, index) => ({
      id: doc.id,
      title: doc.title,
      score: 1.0 - index * 0.01,
      match: { tags },
    }));
  }

  /**
   * Fuzzy search
   */
  fuzzySearch(query: string, maxDistance = 2): SearchResult[] {
    return this.search(query, { fuzzy: maxDistance });
  }

  /**
   * Gets a document from the index
   */
  private getDocument(docId: string): IndexedDocument | undefined {
    return this.documents.get(docId);
  }

  /**
   * Gets all documents
   */
  private getAllDocuments(): IndexedDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Clears the entire index
   */
  clear(): void {
    const allDocs = this.getAllDocuments();
    allDocs.forEach((doc) => this.index.discard(doc.id));
    this.documents.clear();
  }

  /**
   * Gets index statistics
   */
  getStats(): { documentCount: number; termCount: number } {
    return {
      documentCount: this.index.documentCount,
      termCount: this.index.termCount,
    };
  }

  /**
   * Auto-suggest/autocomplete
   */
  autoSuggest(prefix: string, limit = 10): string[] {
    const results = this.search(prefix, { prefix: true });
    return results
      .slice(0, limit)
      .map((r) => r.title)
      .filter((title, index, self) => self.indexOf(title) === index);
  }
}

/**
 * Creates a search indexer
 */
export function createSearchIndexer(): SearchIndexer {
  return new SearchIndexer();
}

/**
 * Converts a Document to IndexedDocument
 */
export function toIndexedDocument(doc: Document, content: string): IndexedDocument {
  return {
    id: doc.id,
    title: doc.title,
    content,
    tags: doc.tags,
    ownerId: doc.ownerId,
    folderId: doc.folderId,
  };
}
