import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Osvauld } from '../../src/osvauld';
import { Capability } from '../../src/ucan/types';

describe('Osvauld Integration', () => {
  let osvauld: Osvauld;

  beforeEach(() => {
    osvauld = new Osvauld({ dbName: `test-${Date.now()}` });
  });

  afterEach(async () => {
    await osvauld.close();
  });

  describe('Authentication Flow', () => {
    it('should register and login a user', async () => {
      const user = await osvauld.register('alice', 'password123', 'alice@example.com');

      expect(user.username).toBe('alice');
      expect(user.email).toBe('alice@example.com');
      expect(osvauld.isLoggedIn()).toBe(true);

      osvauld.logout();
      expect(osvauld.isLoggedIn()).toBe(false);

      const loginUser = await osvauld.login('alice', 'password123');
      expect(loginUser.id).toBe(user.id);
      expect(osvauld.isLoggedIn()).toBe(true);
    });

    it('should require authentication for protected operations', async () => {
      await expect(
        osvauld.createDocument('Test', 'content')
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('Document Management Flow', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
    });

    it('should create, read, update, and delete documents', async () => {
      // Create
      const doc = await osvauld.createDocument('My Note', 'Hello World');
      expect(doc.title).toBe('My Note');

      // Read
      const { document, content } = await osvauld.getDocument(doc.id);
      expect(document.id).toBe(doc.id);
      expect(content).toBe('Hello World');

      // Update
      const updated = await osvauld.updateDocument(doc.id, 'Updated content');
      expect(updated.id).toBe(doc.id);

      const { content: newContent } = await osvauld.getDocument(doc.id);
      expect(newContent).toBe('Updated content');

      // Delete
      await osvauld.deleteDocument(doc.id);
      await expect(osvauld.getDocument(doc.id)).rejects.toThrow();
    });

    it('should list all documents', async () => {
      await osvauld.createDocument('Doc 1', 'Content 1');
      await osvauld.createDocument('Doc 2', 'Content 2');
      await osvauld.createDocument('Doc 3', 'Content 3');

      const docs = await osvauld.listDocuments();
      expect(docs.length).toBe(3);
    });

    it('should toggle favorite', async () => {
      const doc = await osvauld.createDocument('Favorite Test', 'content');
      expect(doc.isFavorite).toBe(false);

      const favorited = await osvauld.toggleFavorite(doc.id);
      expect(favorited.isFavorite).toBe(true);

      const unfavorited = await osvauld.toggleFavorite(doc.id);
      expect(unfavorited.isFavorite).toBe(false);
    });

    it('should add tags', async () => {
      const doc = await osvauld.createDocument('Tagged Doc', 'content');

      const tagged = await osvauld.addTags(doc.id, ['work', 'important']);
      expect(tagged.tags).toContain('work');
      expect(tagged.tags).toContain('important');
    });
  });

  describe('Folder Management Flow', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
    });

    it('should create and organize folders', async () => {
      const root = await osvauld.createFolder('Work');
      const sub = await osvauld.createFolder('Projects', root.id);

      expect(root.name).toBe('Work');
      expect(sub.parentId).toBe(root.id);
    });

    it('should get folder tree', async () => {
      await osvauld.createFolder('Personal');
      await osvauld.createFolder('Work');

      const tree = await osvauld.getFolderTree();
      expect(tree.length).toBeGreaterThanOrEqual(2);
    });

    it('should move folders', async () => {
      const folder1 = await osvauld.createFolder('Folder 1');
      const folder2 = await osvauld.createFolder('Folder 2');

      const moved = await osvauld.moveFolder(folder2.id, folder1.id);
      expect(moved.parentId).toBe(folder1.id);
    });

    it('should delete folders', async () => {
      const folder = await osvauld.createFolder('Temp');

      await osvauld.deleteFolder(folder.id);

      const tree = await osvauld.getFolderTree();
      expect(tree.find((f) => f.id === folder.id)).toBeUndefined();
    });
  });

  describe('Search Flow', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
      await osvauld.createDocument('JavaScript Guide', 'Learn JavaScript basics');
      await osvauld.createDocument('TypeScript Tutorial', 'TypeScript for beginners');
      await osvauld.createDocument('Python Notes', 'Python programming');
    });

    it('should search documents', () => {
      const results = osvauld.search('JavaScript');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.title).toContain('JavaScript');
    });

    it('should fuzzy search', () => {
      const results = osvauld.search('Javscript', { fuzzy: true }); // Typo

      expect(results.length).toBeGreaterThan(0);
    });

    it('should auto-suggest', () => {
      const suggestions = osvauld.autoSuggest('Java');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('JavaScript');
    });
  });

  describe('Sharing Flow', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
    });

    it('should share a document', async () => {
      const doc = await osvauld.createDocument('Shared Doc', 'Shared content');

      // Create a recipient key (in real scenario, this would be Bob's public key)
      const recipientPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // Dummy key

      const { shareId, token } = await osvauld.shareDocument(
        doc.id,
        recipientPublicKey,
        [Capability.READ],
        24 * 60 * 60 * 1000 // 24 hours
      );

      expect(shareId).toBeDefined();
      expect(token).toBeDefined();
    });

    it('should list document shares', async () => {
      const doc = await osvauld.createDocument('Shared Doc', 'content');

      const recipientPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      await osvauld.shareDocument(doc.id, recipientPublicKey, [Capability.READ]);

      const shares = await osvauld.getDocumentShares(doc.id);
      expect(shares.length).toBe(1);
    });

    it('should revoke a share', async () => {
      const doc = await osvauld.createDocument('Shared Doc', 'content');

      const recipientPublicKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      const { shareId } = await osvauld.shareDocument(
        doc.id,
        recipientPublicKey,
        [Capability.READ]
      );

      await osvauld.revokeShare(shareId);

      const shares = await osvauld.getDocumentShares(doc.id);
      expect(shares.length).toBe(0);
    });
  });

  describe('Collaborative Editing Flow', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
    });

    it('should open document for collaboration', async () => {
      const doc = await osvauld.createDocument('Collab Doc', 'Initial content');

      const { ydoc, syncManager } = await osvauld.openDocumentForCollaboration(doc.id);

      expect(ydoc).toBeDefined();
      expect(syncManager).toBeDefined();
    });

    it('should save collaborative changes', async () => {
      const doc = await osvauld.createDocument('Collab Doc', 'Initial content');

      const { ydoc } = await osvauld.openDocumentForCollaboration(doc.id);

      // Make some edits
      const ytext = ydoc.getText('content');
      ytext.insert(ytext.length, ' - Edited');

      // Save
      await osvauld.saveCollaborativeDocument(doc.id, ydoc);

      // Verify changes persisted
      const { content } = await osvauld.getDocument(doc.id);
      expect(content).toContain('Edited');
    });
  });

  describe('Complete Workflow', () => {
    it('should handle complete user workflow', async () => {
      // 1. Register
      const user = await osvauld.register('alice', 'password123', 'alice@example.com');
      expect(user.username).toBe('alice');

      // 2. Create folders
      const workFolder = await osvauld.createFolder('Work');
      const personalFolder = await osvauld.createFolder('Personal');

      // 3. Create documents
      const doc1 = await osvauld.createDocument('Meeting Notes', 'Team sync at 2pm', {
        folderId: workFolder.id,
        tags: ['work', 'meeting'],
      });

      const doc2 = await osvauld.createDocument('Shopping List', 'Milk, Eggs, Bread', {
        folderId: personalFolder.id,
        tags: ['personal', 'todo'],
      });

      // 4. Search
      const workDocs = osvauld.search('work');
      expect(workDocs.length).toBeGreaterThan(0);

      // 5. Update document
      await osvauld.updateDocument(doc1.id, 'Team sync at 3pm - UPDATED');

      // 6. Toggle favorite
      await osvauld.toggleFavorite(doc2.id);

      // 7. Share document
      const recipientKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const { shareId } = await osvauld.shareDocument(
        doc1.id,
        recipientKey,
        [Capability.READ, Capability.WRITE]
      );

      // 8. Get stats
      const stats = await osvauld.getStats();
      expect(stats.documents).toBe(2);
      expect(stats.folders).toBe(2);
      expect(stats.shares).toBe(1);

      // 9. Logout and login
      osvauld.logout();
      expect(osvauld.isLoggedIn()).toBe(false);

      await osvauld.login('alice', 'password123');
      expect(osvauld.isLoggedIn()).toBe(true);

      // 10. Verify data persisted
      const docs = await osvauld.listDocuments();
      expect(docs.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await osvauld.register('alice', 'password123');
    });

    it('should provide accurate statistics', async () => {
      await osvauld.createDocument('Doc 1', 'content');
      await osvauld.createDocument('Doc 2', 'content');
      await osvauld.createFolder('Folder 1');

      const stats = await osvauld.getStats();

      expect(stats.documents).toBe(2);
      expect(stats.folders).toBe(1);
      expect(stats.searchIndex.documentCount).toBe(2);
    });
  });
});
