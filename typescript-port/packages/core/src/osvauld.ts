/**
 * Osvauld Main Service
 *
 * Unified API that orchestrates all Osvauld modules.
 */

import { initDatabase, type OsvauldDB } from './storage/indexeddb';
import { UserRepository } from './storage/repositories/user';
import { DocumentRepository } from './storage/repositories/document';
import { FolderRepository } from './storage/repositories/folder';
import { ShareLinkRepository } from './storage/repositories/share-link';
import { AuthenticationManager } from './auth/manager';
import { DocumentManager } from './documents/manager';
import { FolderManager } from './documents/folders';
import { SharingManager } from './sharing/manager';
import { SearchIndexer, toIndexedDocument } from './search/indexer';
import { createYDoc, getYText, getText } from './crdt/ydoc';
import { P2PSyncManager } from './p2p/sync';
import { saveEncryptedState, loadEncryptedState } from './crdt/persistence';
import { decryptDocument } from './documents/encryption';
import { importKey } from './crypto/aes';
import type { User } from './types/user';
import type { Document } from './types/document';
import type { Folder } from './types/folder';
import type { ShareRequest, Capability } from './ucan/types';
import type * as Y from 'yjs';

/**
 * Osvauld service configuration
 */
export interface OsvauldConfig {
  dbName?: string;
}

/**
 * Main Osvauld service
 */
export class Osvauld {
  private db: OsvauldDB;
  private auth: AuthenticationManager;
  private documents: DocumentManager;
  private folders: FolderManager;
  private sharing: SharingManager;
  private searchIndexer: SearchIndexer;

  private currentUser?: User;
  private currentSession?: { privateKey: Uint8Array; publicKey: Uint8Array };

  constructor(config: OsvauldConfig = {}) {
    // Initialize database
    this.db = initDatabase(config.dbName);

    // Initialize repositories
    const userRepo = new UserRepository(this.db);
    const docRepo = new DocumentRepository(this.db.documents);
    const folderRepo = new FolderRepository(this.db.folders);
    const shareLinkRepo = new ShareLinkRepository(this.db.shareLinks);

    // Initialize managers
    this.auth = new AuthenticationManager(userRepo);
    this.documents = new DocumentManager(docRepo);
    this.folders = new FolderManager(folderRepo);
    this.sharing = new SharingManager(shareLinkRepo);
    this.searchIndexer = new SearchIndexer();
  }

  // ==================== Authentication ====================

  /**
   * Registers a new user
   */
  async register(username: string, password: string, email?: string): Promise<User> {
    const { user, session } = await this.auth.register(username, password, { email });
    this.currentUser = user;
    this.currentSession = session;
    return user;
  }

  /**
   * Logs in a user
   */
  async login(username: string, password: string): Promise<User> {
    const { user, session } = await this.auth.login(username, password);
    this.currentUser = user;
    this.currentSession = session;
    return user;
  }

  /**
   * Logs out the current user
   */
  logout(): void {
    this.currentUser = undefined;
    this.currentSession = undefined;
  }

  /**
   * Gets the current user
   */
  getCurrentUser(): User | undefined {
    return this.currentUser;
  }

  /**
   * Checks if a user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUser !== undefined;
  }

  // ==================== Documents ====================

  /**
   * Creates a new document
   */
  async createDocument(
    title: string,
    content: string,
    options: {
      folderId?: string;
      tags?: string[];
    } = {}
  ): Promise<Document> {
    this.requireAuth();

    let doc = await this.documents.createDocument(
      title,
      content,
      this.currentUser!.id,
      {
        privateKey: this.currentSession!.privateKey,
        publicKey: this.currentSession!.publicKey,
      },
      options.folderId
    );

    // Add tags if provided
    if (options.tags && options.tags.length > 0) {
      doc = await this.documents.addTags(doc.id, options.tags, this.currentUser!.id);
    }

    // Index for search
    const indexed = toIndexedDocument(doc, content);
    this.searchIndexer.addDocument(indexed);

    return doc;
  }

  /**
   * Gets a document by ID
   */
  /**
   * Gets a document by ID
   */
  async getDocument(documentId: string): Promise<{ document: Document; content: string }> {
    this.requireAuth();

    // Get document key from sandbox store (simplified for testing)
    const { getSandboxDocumentKey } = await import('./documents/encryption');
    const documentKey = getSandboxDocumentKey(documentId);

    if (!documentKey) {
      throw new Error('Document key not found (sandbox limitation)');
    }

    const result = await this.documents.getDocument(
      documentId,
      this.currentUser!.id,
      {
        privateKey: this.currentSession!.privateKey,
        publicKey: this.currentSession!.publicKey,
      },
      documentKey
    );

    return result;
  }

  /**
   * Updates a document
   */
  async updateDocument(documentId: string, content: string): Promise<Document> {
    this.requireAuth();

    const doc = await this.documents.updateDocument(
      documentId,
      content,
      this.currentUser!.id,
      {
        privateKey: this.currentSession!.privateKey,
        publicKey: this.currentSession!.publicKey,
      }
    );

    // Update search index
    const indexed = toIndexedDocument(doc, content);
    this.searchIndexer.updateDocument(indexed);

    return doc;
  }

  /**
   * Deletes a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.requireAuth();

    await this.documents.deleteDocument(documentId, this.currentUser!.id);
    this.searchIndexer.removeDocument(documentId);
  }

  /**
   * Lists all documents for the current user
   */
  async listDocuments(): Promise<Document[]> {
    this.requireAuth();

    return await this.documents.listDocuments(this.currentUser!.id);
  }

  /**
   * Toggles favorite status
   */
  async toggleFavorite(documentId: string): Promise<Document> {
    this.requireAuth();

    return await this.documents.toggleFavorite(documentId, this.currentUser!.id);
  }

  /**
   * Adds tags to a document
   */
  async addTags(documentId: string, tags: string[]): Promise<Document> {
    this.requireAuth();

    return await this.documents.addTags(documentId, tags, this.currentUser!.id);
  }

  // ==================== Folders ====================

  /**
   * Creates a new folder
   */
  async createFolder(name: string, parentId?: string): Promise<Folder> {
    this.requireAuth();

    return await this.folders.createFolder(this.currentUser!.id, name, parentId);
  }

  /**
   * Gets folder tree
   */
  async getFolderTree(): Promise<Folder[]> {
    this.requireAuth();

    return await this.folders.getFolderTree(this.currentUser!.id);
  }

  /**
   * Moves a folder
   */
  async moveFolder(folderId: string, newParentId?: string): Promise<Folder> {
    this.requireAuth();

    return await this.folders.moveFolder(folderId, newParentId, this.currentUser!.id);
  }

  /**
   * Deletes a folder
   */
  async deleteFolder(folderId: string): Promise<void> {
    this.requireAuth();

    await this.folders.deleteFolder(folderId, this.currentUser!.id);
  }

  // ==================== Search ====================

  /**
   * Searches documents
   */
  search(query: string, options?: { fuzzy?: boolean }): Array<{
    id: string;
    title: string;
    score: number;
  }> {
    if (options?.fuzzy) {
      return this.searchIndexer.fuzzySearch(query);
    }
    return this.searchIndexer.search(query);
  }

  /**
   * Auto-suggests document titles
   */
  autoSuggest(prefix: string, limit?: number): string[] {
    return this.searchIndexer.autoSuggest(prefix, limit);
  }

  // ==================== Sharing ====================

  /**
   * Creates a share link for a document
   */
  async shareDocument(
    documentId: string,
    recipientPublicKey: string,
    capabilities: Capability[],
    expiresIn?: number
  ): Promise<{ shareId: string; token: string }> {
    this.requireAuth();

    const shareLink = await this.sharing.createShareLink(
      {
        documentId,
        recipientPublicKey,
        capabilities,
        expiresIn,
      },
      this.currentSession!.privateKey,
      this.currentSession!.publicKey
    );

    return {
      shareId: shareLink.id,
      token: shareLink.token,
    };
  }

  /**
   * Revokes a share link
   */
  async revokeShare(shareLinkId: string): Promise<void> {
    this.requireAuth();

    await this.sharing.revokeShareLink(shareLinkId);
  }

  /**
   * Lists share links for a document
   */
  async getDocumentShares(documentId: string) {
    this.requireAuth();

    return await this.sharing.getShareLinks(documentId);
  }

  /**
   * Verifies access to a document with a token
   */
  async verifyAccess(
    token: string,
    documentId: string,
    capability: Capability
  ): Promise<boolean> {
    return await this.sharing.verifyAccess(token, documentId, capability);
  }

  // ==================== Collaborative Editing ====================

  /**
   * Opens a document for collaborative editing
   */
  async openDocumentForCollaboration(documentId: string): Promise<{
    ydoc: Y.Doc;
    syncManager: P2PSyncManager;
  }> {
    this.requireAuth();

    // Load document content
    const { content } = await this.getDocument(documentId);

    // Try to load persisted CRDT state
    const ydoc = createYDoc(documentId);
    const persistedState = await loadEncryptedState(
      documentId,
      this.currentSession!.privateKey
    );

    if (persistedState) {
      // Apply persisted state
      Y.applyUpdate(ydoc, persistedState);
    } else {
      // Initialize with current content
      const ytext = getYText(ydoc);
      ytext.insert(0, content);
    }

    // Create sync manager for P2P collaboration
    const syncManager = new P2PSyncManager(ydoc);

    return { ydoc, syncManager };
  }

  /**
   * Saves collaborative document state
   */
  async saveCollaborativeDocument(
    documentId: string,
    ydoc: Y.Doc
  ): Promise<void> {
    this.requireAuth();

    // Get current text content
    const ytext = getYText(ydoc);
    const content = getText(ytext);

    // Update document with new content
    await this.updateDocument(documentId, content);

    // Save CRDT state
    await saveEncryptedState(ydoc, documentId, this.currentSession!.privateKey);
  }

  // ==================== Utilities ====================

  /**
   * Gets database statistics
   */
  async getStats(): Promise<{
    documents: number;
    folders: number;
    shares: number;
    searchIndex: { documentCount: number; termCount: number };
  }> {
    const documents = await this.db.documents.count();
    const folders = await this.db.folders.count();
    const shares = await this.db.shareLinks.count();
    const searchIndex = this.searchIndexer.getStats();

    return { documents, folders, shares, searchIndex };
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Requires authentication
   */
  private requireAuth(): asserts this is this & { currentUser: User; currentSession: { privateKey: Uint8Array; publicKey: Uint8Array } } {
    if (!this.currentUser || !this.currentSession) {
      throw new Error('Authentication required');
    }
  }
}

/**
 * Creates a new Osvauld instance
 */
export function createOsvauld(config?: OsvauldConfig): Osvauld {
  return new Osvauld(config);
}
