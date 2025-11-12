import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../../test/mocks/indexeddb'; // Import fake-indexeddb
import {
  initDatabase,
  closeDatabase,
  deleteDatabase,
  type OsvauldDB,
} from '../../../src/storage/indexeddb';
import type { User, Document, Folder } from '../../../src/types';

describe('IndexedDB Storage', () => {
  let db: OsvauldDB;
  const dbName = 'test-osvauld-' + Date.now();

  beforeEach(async () => {
    db = initDatabase(dbName);
  });

  afterEach(async () => {
    await closeDatabase(db);
    await deleteDatabase(dbName);
  });

  describe('Database Initialization', () => {
    it('should initialize database', () => {
      expect(db).toBeDefined();
      expect(db.users).toBeDefined();
      expect(db.documents).toBeDefined();
      expect(db.folders).toBeDefined();
      expect(db.shares).toBeDefined();
      expect(db.devices).toBeDefined();
    });

    it('should create tables', async () => {
      const tables = db.tables.map((t) => t.name);

      expect(tables).toContain('users');
      expect(tables).toContain('documents');
      expect(tables).toContain('folders');
      expect(tables).toContain('shares');
      expect(tables).toContain('devices');
    });
  });

  describe('User Operations', () => {
    it('should add and retrieve user', async () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        publicKey: new Uint8Array([1, 2, 3]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.users.add(user);
      const retrieved = await db.users.get('user-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.username).toBe('testuser');
    });

    it('should update user', async () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        publicKey: new Uint8Array([1, 2, 3]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.users.add(user);
      await db.users.update('user-1', { email: 'updated@example.com' });

      const updated = await db.users.get('user-1');
      expect(updated?.email).toBe('updated@example.com');
    });

    it('should delete user', async () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        publicKey: new Uint8Array([1, 2, 3]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.users.add(user);
      await db.users.delete('user-1');

      const deleted = await db.users.get('user-1');
      expect(deleted).toBeUndefined();
    });
  });

  describe('Document Operations', () => {
    it('should add and retrieve document', async () => {
      const doc: Document = {
        id: 'doc-1',
        title: 'Test Document',
        encryptedContent: new Uint8Array([1, 2, 3]),
        iv: new Uint8Array([4, 5, 6]),
        ownerId: 'user-1',
        tags: ['test'],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.documents.add(doc);
      const retrieved = await db.documents.get('doc-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Document');
    });

    it('should query documents by owner', async () => {
      const doc1: Document = {
        id: 'doc-1',
        title: 'Doc 1',
        encryptedContent: new Uint8Array([1]),
        iv: new Uint8Array([1]),
        ownerId: 'user-1',
        tags: [],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const doc2: Document = {
        id: 'doc-2',
        title: 'Doc 2',
        encryptedContent: new Uint8Array([2]),
        iv: new Uint8Array([2]),
        ownerId: 'user-1',
        tags: [],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.documents.bulkAdd([doc1, doc2]);

      const userDocs = await db.documents
        .where('ownerId')
        .equals('user-1')
        .toArray();

      expect(userDocs.length).toBe(2);
    });

    it('should query documents by tags', async () => {
      const doc1: Document = {
        id: 'doc-1',
        title: 'Doc 1',
        encryptedContent: new Uint8Array([1]),
        iv: new Uint8Array([1]),
        ownerId: 'user-1',
        tags: ['important', 'work'],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.documents.add(doc1);

      const workDocs = await db.documents
        .where('tags')
        .equals('work')
        .toArray();

      expect(workDocs.length).toBe(1);
    });
  });

  describe('Folder Operations', () => {
    it('should create folder hierarchy', async () => {
      const folder1: Folder = {
        id: 'folder-1',
        name: 'Root',
        parentId: null,
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const folder2: Folder = {
        id: 'folder-2',
        name: 'Child',
        parentId: 'folder-1',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.folders.bulkAdd([folder1, folder2]);

      const children = await db.folders
        .where('parentId')
        .equals('folder-1')
        .toArray();

      expect(children.length).toBe(1);
      expect(children[0]?.name).toBe('Child');
    });
  });

  describe('Transactions', () => {
    it('should support transactions', async () => {
      await db.transaction('rw', db.users, db.documents, async () => {
        const user: User = {
          id: 'user-1',
          username: 'testuser',
          publicKey: new Uint8Array([1, 2, 3]),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const doc: Document = {
          id: 'doc-1',
          title: 'Test Doc',
          encryptedContent: new Uint8Array([1]),
          iv: new Uint8Array([1]),
          ownerId: 'user-1',
          tags: [],
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.users.add(user);
        await db.documents.add(doc);
      });

      const user = await db.users.get('user-1');
      const doc = await db.documents.get('doc-1');

      expect(user).toBeDefined();
      expect(doc).toBeDefined();
    });
  });
});
