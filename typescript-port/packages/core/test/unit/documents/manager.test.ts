import 'fake-indexeddb/auto';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentManager } from '../../../src/documents/manager';
import { DocumentRepository } from '../../../src/storage/repositories/document';
import { generateKeyPair as generateEd25519KeyPair } from '../../../src/crypto/ed25519';
import { initDatabase } from '../../../src/storage/indexeddb';
import type { KeyPair } from '../../../src/crypto/ed25519';
import { generateKey } from '../../../src/crypto/aes';

describe('Document Manager', () => {
  let manager: DocumentManager;
  let documentRepo: DocumentRepository;
  let ownerKeyPair: KeyPair;
  let documentKey: CryptoKey;
  const ownerId = 'owner-123';
  const userId2 = 'user-456';

  beforeEach(async () => {
    const db = initDatabase('test-doc-manager-' + Date.now());
    documentRepo = new DocumentRepository(db.documents);
    manager = new DocumentManager(documentRepo);
    ownerKeyPair = await generateEd25519KeyPair();
    documentKey = await generateKey();
  });

  describe('createDocument', () => {
    it('should create encrypted document', async () => {
      const title = 'My Document';
      const content = 'This is the document content';

      const document = await manager.createDocument(
        title,
        content,
        ownerId,
        ownerKeyPair
      );

      expect(document.id).toBeDefined();
      expect(document.title).toBe(title);
      expect(document.ownerId).toBe(ownerId);
      expect(document.encryptedContent).toBeDefined();
      expect(document.signature).toBeDefined();
      expect(document.createdAt).toBeInstanceOf(Date);
    });

    it('should create document in folder', async () => {
      const folderId = 'folder-123';

      const document = await manager.createDocument(
        'Document',
        'Content',
        ownerId,
        ownerKeyPair,
        folderId
      );

      expect(document.folderId).toBe(folderId);
    });

    it('should initialize document with defaults', async () => {
      const document = await manager.createDocument(
        'Test',
        'Content',
        ownerId,
        ownerKeyPair
      );

      expect(document.tags).toEqual([]);
      expect(document.isFavorite).toBe(false);
      expect(document.lastAccessedAt).toBeInstanceOf(Date);
    });
  });

  describe('getDocument', () => {
    it('should retrieve and decrypt document', async () => {
      const title = 'Test Doc';
      const content = 'Secret content';

      const created = await manager.createDocument(title, content, ownerId, ownerKeyPair);
      const storedKey = (created as any).__documentKey;

      const { document, content: decrypted } = await manager.getDocument(
        created.id,
        ownerId,
        ownerKeyPair,
        storedKey
      );

      expect(document.id).toBe(created.id);
      expect(document.title).toBe(title);
      expect(decrypted).toBe(content);
    });

    it('should deny access to non-owner', async () => {
      const created = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);
      const storedKey = (created as any).__documentKey;
      const otherKeyPair = await generateEd25519KeyPair();

      await expect(
        manager.getDocument(created.id, userId2, otherKeyPair, storedKey)
      ).rejects.toThrow('Access denied');
    });

    it('should handle Unicode content', async () => {
      const unicodeContent = '你好世界 🌍 مرحبا';

      const created = await manager.createDocument(
        'Unicode',
        unicodeContent,
        ownerId,
        ownerKeyPair
      );
      const storedKey = (created as any).__documentKey;

      const { content } = await manager.getDocument(
        created.id,
        ownerId,
        ownerKeyPair,
        storedKey
      );

      expect(content).toBe(unicodeContent);
    });
  });

  describe('updateDocument', () => {
    it('should update document content', async () => {
      const originalContent = 'Original';
      const updatedContent = 'Updated';

      const created = await manager.createDocument(
        'Doc',
        originalContent,
        ownerId,
        ownerKeyPair
      );
      const storedKey = (created as any).__documentKey;

      const updated = await manager.updateDocument(
        created.id,
        updatedContent,
        ownerId,
        ownerKeyPair,
        storedKey
      );

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.createdAt.getTime());

      // Verify updated content
      const { content } = await manager.getDocument(
        created.id,
        ownerId,
        ownerKeyPair,
        storedKey
      );
      expect(content).toBe(updatedContent);
    });

    it('should deny update to non-owner', async () => {
      const created = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);
      const storedKey = (created as any).__documentKey;
      const otherKeyPair = await generateEd25519KeyPair();

      await expect(
        manager.updateDocument(created.id, 'New', userId2, otherKeyPair, storedKey)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      const created = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      await manager.deleteDocument(created.id, ownerId);

      await expect(documentRepo.get(created.id)).rejects.toThrow();
    });

    it('should deny deletion to non-owner', async () => {
      const created = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      await expect(manager.deleteDocument(created.id, userId2)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('listDocuments', () => {
    it('should list all user documents', async () => {
      await manager.createDocument('Doc 1', 'Content 1', ownerId, ownerKeyPair);
      await manager.createDocument('Doc 2', 'Content 2', ownerId, ownerKeyPair);
      await manager.createDocument('Doc 3', 'Content 3', ownerId, ownerKeyPair);

      const docs = await manager.listDocuments(ownerId);

      expect(docs).toHaveLength(3);
      expect(docs.map((d) => d.title)).toContain('Doc 1');
      expect(docs.map((d) => d.title)).toContain('Doc 2');
      expect(docs.map((d) => d.title)).toContain('Doc 3');
    });

    it('should only list own documents', async () => {
      await manager.createDocument('My Doc', 'Content', ownerId, ownerKeyPair);

      const otherKeyPair = await generateEd25519KeyPair();
      await manager.createDocument('Other Doc', 'Content', userId2, otherKeyPair);

      const myDocs = await manager.listDocuments(ownerId);
      const otherDocs = await manager.listDocuments(userId2);

      expect(myDocs).toHaveLength(1);
      expect(myDocs[0]!.title).toBe('My Doc');
      expect(otherDocs).toHaveLength(1);
      expect(otherDocs[0]!.title).toBe('Other Doc');
    });
  });

  describe('listDocumentsInFolder', () => {
    it('should list documents in folder', async () => {
      const folderId = 'folder-1';

      await manager.createDocument('Doc 1', 'Content', ownerId, ownerKeyPair, folderId);
      await manager.createDocument('Doc 2', 'Content', ownerId, ownerKeyPair, folderId);
      await manager.createDocument('Doc 3', 'Content', ownerId, ownerKeyPair, 'other-folder');

      const docs = await manager.listDocumentsInFolder(ownerId, folderId);

      expect(docs).toHaveLength(2);
      expect(docs.every((d) => d.folderId === folderId)).toBe(true);
    });
  });

  describe('moveToFolder', () => {
    it('should move document to folder', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);
      const folderId = 'new-folder';

      await manager.moveToFolder(doc.id, folderId, ownerId);

      const updated = await documentRepo.get(doc.id);
      expect(updated.folderId).toBe(folderId);
    });

    it('should remove from folder when undefined', async () => {
      const doc = await manager.createDocument(
        'Doc',
        'Content',
        ownerId,
        ownerKeyPair,
        'folder-1'
      );

      await manager.moveToFolder(doc.id, undefined, ownerId);

      const updated = await documentRepo.get(doc.id);
      expect(updated.folderId).toBeUndefined();
    });

    it('should deny move to non-owner', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      await expect(manager.moveToFolder(doc.id, 'folder', userId2)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      expect(doc.isFavorite).toBe(false);

      const toggled1 = await manager.toggleFavorite(doc.id, ownerId);
      expect(toggled1.isFavorite).toBe(true);

      const toggled2 = await manager.toggleFavorite(doc.id, ownerId);
      expect(toggled2.isFavorite).toBe(false);
    });
  });

  describe('tags', () => {
    it('should add tags to document', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      const updated = await manager.addTags(doc.id, ['tag1', 'tag2'], ownerId);

      expect(updated.tags).toEqual(['tag1', 'tag2']);
    });

    it('should not duplicate tags', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);

      await manager.addTags(doc.id, ['tag1'], ownerId);
      const updated = await manager.addTags(doc.id, ['tag1', 'tag2'], ownerId);

      expect(updated.tags).toEqual(['tag1', 'tag2']);
    });

    it('should remove tags from document', async () => {
      const doc = await manager.createDocument('Doc', 'Content', ownerId, ownerKeyPair);
      await manager.addTags(doc.id, ['tag1', 'tag2', 'tag3'], ownerId);

      const updated = await manager.removeTags(doc.id, ['tag2'], ownerId);

      expect(updated.tags).toEqual(['tag1', 'tag3']);
    });
  });

  describe('queryByTags', () => {
    it('should find documents by tags', async () => {
      const doc1 = await manager.createDocument('Doc 1', 'Content', ownerId, ownerKeyPair);
      const doc2 = await manager.createDocument('Doc 2', 'Content', ownerId, ownerKeyPair);
      const doc3 = await manager.createDocument('Doc 3', 'Content', ownerId, ownerKeyPair);

      await manager.addTags(doc1.id, ['typescript', 'tutorial'], ownerId);
      await manager.addTags(doc2.id, ['typescript', 'advanced'], ownerId);
      await manager.addTags(doc3.id, ['javascript'], ownerId);

      const results = await manager.queryByTags(ownerId, ['typescript']);

      expect(results).toHaveLength(2);
      expect(results.map((d) => d.id)).toContain(doc1.id);
      expect(results.map((d) => d.id)).toContain(doc2.id);
    });
  });

  describe('getFavorites', () => {
    it('should get favorite documents', async () => {
      const doc1 = await manager.createDocument('Doc 1', 'Content', ownerId, ownerKeyPair);
      const doc2 = await manager.createDocument('Doc 2', 'Content', ownerId, ownerKeyPair);
      await manager.createDocument('Doc 3', 'Content', ownerId, ownerKeyPair);

      await manager.toggleFavorite(doc1.id, ownerId);
      await manager.toggleFavorite(doc2.id, ownerId);

      const favorites = await manager.getFavorites(ownerId);

      expect(favorites).toHaveLength(2);
      expect(favorites.map((d) => d.id)).toContain(doc1.id);
      expect(favorites.map((d) => d.id)).toContain(doc2.id);
    });
  });

  describe('performance', () => {
    it('should handle multiple documents efficiently', async () => {
      const count = 20;

      const start = performance.now();
      for (let i = 0; i < count; i++) {
        await manager.createDocument(`Doc ${i}`, `Content ${i}`, ownerId, ownerKeyPair);
      }
      const end = performance.now();

      const avgTime = (end - start) / count;
      expect(avgTime).toBeLessThan(100); // < 100ms per document
    });
  });
});
