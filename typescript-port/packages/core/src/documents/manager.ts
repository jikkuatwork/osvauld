/**
 * Document Manager
 *
 * Handles CRUD operations for encrypted documents.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Document } from '../types/document';
import type { DocumentRepository } from '../storage/repositories/document';
import type { KeyPair } from '../crypto/ed25519';
import {
  encryptDocument,
  decryptDocument,
  reEncryptDocument,
  type EncryptedDocument,
} from './encryption';

/**
 * Document Manager class
 */
export class DocumentManager {
  constructor(private documentRepo: DocumentRepository) {}

  /**
   * Creates a new encrypted document
   */
  async createDocument(
    title: string,
    content: string,
    ownerId: string,
    ownerKeyPair: KeyPair,
    folderId?: string
  ): Promise<Document> {
    const docId = uuidv4();

    // Encrypt the document
    const { encrypted, documentKey } = await encryptDocument(
      content,
      ownerId,
      docId,
      ownerKeyPair
    );

    // Store encrypted data as metadata
    const document: Document = {
      id: docId,
      title,
      ownerId,
      folderId,
      encryptedContent: Buffer.from(encrypted.content.ciphertext).toString('base64'),
      contentIV: Buffer.from(encrypted.content.iv).toString('base64'),
      encryptedKey: Buffer.from(encrypted.encryptedKey.ciphertext).toString('base64'),
      keyIV: Buffer.from(encrypted.encryptedKey.iv).toString('base64'),
      signature: Buffer.from(encrypted.signature).toString('base64'),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      isFavorite: false,
      lastAccessedAt: new Date(),
    };

    // Save to repository
    await this.documentRepo.create(document);

    // Store the document key in memory (in real system, key management would be more complex)
    (document as any).__documentKey = documentKey;

    return document;
  }

  /**
   * Gets and decrypts a document
   */
  async getDocument(
    docId: string,
    userId: string,
    userKeyPair: KeyPair,
    documentKey: CryptoKey
  ): Promise<{ document: Document; content: string }> {
    const document = await this.documentRepo.get(docId);

    // Check access rights
    if (document.ownerId !== userId) {
      // In real system, check if shared with user
      throw new Error('Access denied');
    }

    // Reconstruct encrypted document
    const encrypted: EncryptedDocument = {
      content: {
        ciphertext: Uint8Array.from(Buffer.from(document.encryptedContent, 'base64')),
        iv: Uint8Array.from(Buffer.from(document.contentIV, 'base64')),
      },
      encryptedKey: {
        ciphertext: Uint8Array.from(Buffer.from(document.encryptedKey, 'base64')),
        iv: Uint8Array.from(Buffer.from(document.keyIV, 'base64')),
      },
      signature: Uint8Array.from(Buffer.from(document.signature, 'base64')),
      metadata: {
        docId: document.id,
        ownerId: document.ownerId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    };

    // Decrypt content
    const content = await decryptDocument(encrypted, documentKey, userKeyPair.publicKey);

    // Update last accessed
    await this.updateLastAccessed(docId);

    return { document, content };
  }

  /**
   * Updates document content
   */
  async updateDocument(
    docId: string,
    content: string,
    userId: string,
    userKeyPair: KeyPair,
    documentKey: CryptoKey
  ): Promise<Document> {
    const document = await this.documentRepo.get(docId);

    // Check access rights
    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Reconstruct current encrypted document
    const encrypted: EncryptedDocument = {
      content: {
        ciphertext: Uint8Array.from(Buffer.from(document.encryptedContent, 'base64')),
        iv: Uint8Array.from(Buffer.from(document.contentIV, 'base64')),
      },
      encryptedKey: {
        ciphertext: Uint8Array.from(Buffer.from(document.encryptedKey, 'base64')),
        iv: Uint8Array.from(Buffer.from(document.keyIV, 'base64')),
      },
      signature: Uint8Array.from(Buffer.from(document.signature, 'base64')),
      metadata: {
        docId: document.id,
        ownerId: document.ownerId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    };

    // Re-encrypt with new content
    const reEncrypted = await reEncryptDocument(content, encrypted, documentKey, userKeyPair);

    // Update document
    const updated: Document = {
      ...document,
      encryptedContent: Buffer.from(reEncrypted.content.ciphertext).toString('base64'),
      contentIV: Buffer.from(reEncrypted.content.iv).toString('base64'),
      signature: Buffer.from(reEncrypted.signature).toString('base64'),
      updatedAt: new Date(),
    };

    await this.documentRepo.update(updated.id, updated);

    return updated;
  }

  /**
   * Deletes a document
   */
  async deleteDocument(docId: string, userId: string): Promise<void> {
    const document = await this.documentRepo.get(docId);

    // Check access rights
    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    await this.documentRepo.delete(docId);
  }

  /**
   * Lists all documents for a user
   */
  async listDocuments(userId: string): Promise<Document[]> {
    const allDocs = await this.documentRepo.list();
    return allDocs.filter((doc) => doc.ownerId === userId);
  }

  /**
   * Lists documents in a folder
   */
  async listDocumentsInFolder(userId: string, folderId: string): Promise<Document[]> {
    const allDocs = await this.listDocuments(userId);
    return allDocs.filter((doc) => doc.folderId === folderId);
  }

  /**
   * Updates last accessed time
   */
  private async updateLastAccessed(docId: string): Promise<void> {
    const document = await this.documentRepo.get(docId);
    await this.documentRepo.update(docId, {
      ...document,
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Moves document to folder
   */
  async moveToFolder(docId: string, folderId: string | undefined, userId: string): Promise<void> {
    const document = await this.documentRepo.get(docId);

    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    await this.documentRepo.update(docId, {
      ...document,
      folderId,
      updatedAt: new Date(),
    });
  }

  /**
   * Toggles favorite status
   */
  async toggleFavorite(docId: string, userId: string): Promise<Document> {
    const document = await this.documentRepo.get(docId);

    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    const updated = {
      ...document,
      isFavorite: !document.isFavorite,
      updatedAt: new Date(),
    };

    await this.documentRepo.update(docId, updated);

    return updated;
  }

  /**
   * Adds tags to document
   */
  async addTags(docId: string, tags: string[], userId: string): Promise<Document> {
    const document = await this.documentRepo.get(docId);

    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    const newTags = Array.from(new Set([...document.tags, ...tags]));

    const updated = {
      ...document,
      tags: newTags,
      updatedAt: new Date(),
    };

    await this.documentRepo.update(docId, updated);

    return updated;
  }

  /**
   * Removes tags from document
   */
  async removeTags(docId: string, tags: string[], userId: string): Promise<Document> {
    const document = await this.documentRepo.get(docId);

    if (document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    const newTags = document.tags.filter((tag) => !tags.includes(tag));

    const updated = {
      ...document,
      tags: newTags,
      updatedAt: new Date(),
    };

    await this.documentRepo.update(docId, updated);

    return updated;
  }

  /**
   * Queries documents by tags
   */
  async queryByTags(userId: string, tags: string[]): Promise<Document[]> {
    const allDocs = await this.listDocuments(userId);
    return allDocs.filter((doc) => tags.some((tag) => doc.tags.includes(tag)));
  }

  /**
   * Gets favorite documents
   */
  async getFavorites(userId: string): Promise<Document[]> {
    const allDocs = await this.listDocuments(userId);
    return allDocs.filter((doc) => doc.isFavorite);
  }
}

/**
 * Helper to create document manager
 */
export function createDocumentManager(documentRepo: DocumentRepository): DocumentManager {
  return new DocumentManager(documentRepo);
}
