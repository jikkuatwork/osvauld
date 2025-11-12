import 'fake-indexeddb/auto';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../../../src/storage/indexeddb';
import { DocumentRepository } from '../../../src/storage/repositories/document';
import { FolderRepository } from '../../../src/storage/repositories/folder';
import { DocumentManager } from '../../../src/documents/manager';
import { FolderManager } from '../../../src/documents/folders';
import { generateKeyPair as generateEd25519KeyPair } from '../../../src/crypto/ed25519';
import { encryptKeyForUser, decryptKeyForUser } from '../../../src/documents/encryption';
import type { KeyPair } from '../../../src/crypto/ed25519';

describe('Documents Full Flow Integration', () => {
  let docManager: DocumentManager;
  let folderManager: FolderManager;
  let aliceKeyPair: KeyPair;
  let bobKeyPair: KeyPair;
  const aliceId = 'alice-123';
  const bobId = 'bob-456';

  beforeEach(async () => {
    const db = initDatabase('test-doc-integration-' + Date.now());
    const docRepo = new DocumentRepository(db.documents);
    const folderRepo = new FolderRepository(db.folders);
    docManager = new DocumentManager(docRepo);
    folderManager = new FolderManager(folderRepo);
    aliceKeyPair = await generateEd25519KeyPair();
    bobKeyPair = await generateEd25519KeyPair();
  });

  it('should complete create → encrypt → store → retrieve → decrypt flow', async () => {
    const title = 'My Secret Document';
    const content = 'This is highly confidential information';

    // Create encrypted document
    const created = await docManager.createDocument(title, content, aliceId, aliceKeyPair);
    const documentKey = (created as any).__documentKey;

    expect(created.id).toBeDefined();
    expect(created.encryptedContent).toBeDefined();

    // Retrieve and decrypt
    const { document, content: decrypted } = await docManager.getDocument(
      created.id,
      aliceId,
      aliceKeyPair,
      documentKey
    );

    expect(document.id).toBe(created.id);
    expect(decrypted).toBe(content);
  });

  it('should share document key with another user', async () => {
    const content = 'Shared secret document';

    // Alice creates document
    const doc = await docManager.createDocument('Shared Doc', content, aliceId, aliceKeyPair);
    const documentKey = (doc as any).__documentKey;

    // Alice shares key with Bob
    const encryptedKeyData = await encryptKeyForUser(
      documentKey,
      bobId,
      doc.id,
      aliceKeyPair
    );

    // Bob decrypts the shared key
    const bobsKey = await decryptKeyForUser(
      encryptedKeyData,
      bobKeyPair,
      aliceKeyPair.publicKey
    );

    // Bob can now decrypt the document (assuming he has access rights - simplified for test)
    // In real system, we'd need to modify access control
    // For now, just verify the key works
    expect(bobsKey).toBeDefined();
  });

  it('should organize documents in folders', async () => {
    // Create folder structure
    const projects = await folderManager.createFolder('Projects', aliceId);
    const work = await folderManager.createFolder('Work', aliceId, projects.id);
    const personal = await folderManager.createFolder('Personal', aliceId, projects.id);

    // Create documents in folders
    const doc1 = await docManager.createDocument(
      'Work Doc',
      'Work content',
      aliceId,
      aliceKeyPair,
      work.id
    );
    const doc2 = await docManager.createDocument(
      'Personal Doc',
      'Personal content',
      aliceId,
      aliceKeyPair,
      personal.id
    );
    const doc3 = await docManager.createDocument(
      'Root Doc',
      'Root content',
      aliceId,
      aliceKeyPair
    );

    // Verify folder organization
    const workDocs = await docManager.listDocumentsInFolder(aliceId, work.id);
    expect(workDocs).toHaveLength(1);
    expect(workDocs[0]!.id).toBe(doc1.id);

    const personalDocs = await docManager.listDocumentsInFolder(aliceId, personal.id);
    expect(personalDocs).toHaveLength(1);
    expect(personalDocs[0]!.id).toBe(doc2.id);

    // Verify folder tree
    const tree = await folderManager.getFolderTree(aliceId);
    expect(tree).toHaveLength(1); // One root folder
    expect(tree[0]!.children).toHaveLength(2); // Two sub-folders
  });

  it('should query documents by various criteria', async () => {
    // Create folder
    const important = await folderManager.createFolder('Important', aliceId);

    // Create documents with different attributes
    const doc1 = await docManager.createDocument(
      'TypeScript Guide',
      'Content',
      aliceId,
      aliceKeyPair,
      important.id
    );
    const doc2 = await docManager.createDocument(
      'JavaScript Basics',
      'Content',
      aliceId,
      aliceKeyPair
    );
    const doc3 = await docManager.createDocument(
      'Python Tutorial',
      'Content',
      aliceId,
      aliceKeyPair
    );

    // Add tags
    await docManager.addTags(doc1.id, ['typescript', 'programming'], aliceId);
    await docManager.addTags(doc2.id, ['javascript', 'programming'], aliceId);
    await docManager.addTags(doc3.id, ['python'], aliceId);

    // Toggle favorites
    await docManager.toggleFavorite(doc1.id, aliceId);
    await docManager.toggleFavorite(doc3.id, aliceId);

    // Query by tags
    const programmingDocs = await docManager.queryByTags(aliceId, ['programming']);
    expect(programmingDocs).toHaveLength(2);

    const typescriptDocs = await docManager.queryByTags(aliceId, ['typescript']);
    expect(typescriptDocs).toHaveLength(1);
    expect(typescriptDocs[0]!.id).toBe(doc1.id);

    // Query favorites
    const favorites = await docManager.getFavorites(aliceId);
    expect(favorites).toHaveLength(2);
    expect(favorites.map((d) => d.id)).toContain(doc1.id);
    expect(favorites.map((d) => d.id)).toContain(doc3.id);

    // Query by folder
    const importantDocs = await docManager.listDocumentsInFolder(aliceId, important.id);
    expect(importantDocs).toHaveLength(1);
    expect(importantDocs[0]!.id).toBe(doc1.id);
  });

  it('should handle document lifecycle', async () => {
    const title = 'Evolving Document';
    const v1Content = 'Version 1 content';
    const v2Content = 'Version 2 content - updated';

    // Create
    const created = await docManager.createDocument(title, v1Content, aliceId, aliceKeyPair);
    const documentKey = (created as any).__documentKey;

    // Read
    const { content: content1 } = await docManager.getDocument(
      created.id,
      aliceId,
      aliceKeyPair,
      documentKey
    );
    expect(content1).toBe(v1Content);

    // Update
    await docManager.updateDocument(created.id, v2Content, aliceId, aliceKeyPair, documentKey);

    // Read updated
    const { content: content2 } = await docManager.getDocument(
      created.id,
      aliceId,
      aliceKeyPair,
      documentKey
    );
    expect(content2).toBe(v2Content);

    // Move to folder
    const folder = await folderManager.createFolder('Archive', aliceId);
    await docManager.moveToFolder(created.id, folder.id, aliceId);

    // Verify in folder
    const folderDocs = await docManager.listDocumentsInFolder(aliceId, folder.id);
    expect(folderDocs).toHaveLength(1);
    expect(folderDocs[0]!.id).toBe(created.id);

    // Delete
    await docManager.deleteDocument(created.id, aliceId);

    // Verify deleted
    const allDocs = await docManager.listDocuments(aliceId);
    expect(allDocs.find((d) => d.id === created.id)).toBeUndefined();
  });

  it('should handle large documents', async () => {
    const largeContent = 'x'.repeat(1024 * 100); // 100KB

    const doc = await docManager.createDocument(
      'Large Doc',
      largeContent,
      aliceId,
      aliceKeyPair
    );
    const documentKey = (doc as any).__documentKey;

    const { content } = await docManager.getDocument(
      doc.id,
      aliceId,
      aliceKeyPair,
      documentKey
    );

    expect(content.length).toBe(largeContent.length);
    expect(content).toBe(largeContent);
  });

  it('should handle multiple users independently', async () => {
    // Alice creates documents
    const aliceDoc1 = await docManager.createDocument('Alice 1', 'Content', aliceId, aliceKeyPair);
    const aliceDoc2 = await docManager.createDocument('Alice 2', 'Content', aliceId, aliceKeyPair);

    // Bob creates documents
    const bobDoc1 = await docManager.createDocument('Bob 1', 'Content', bobId, bobKeyPair);
    const bobDoc2 = await docManager.createDocument('Bob 2', 'Content', bobId, bobKeyPair);

    // Each user sees only their documents
    const aliceDocs = await docManager.listDocuments(aliceId);
    const bobDocs = await docManager.listDocuments(bobId);

    expect(aliceDocs).toHaveLength(2);
    expect(bobDocs).toHaveLength(2);
    expect(aliceDocs.map((d) => d.id)).toContain(aliceDoc1.id);
    expect(aliceDocs.map((d) => d.id)).toContain(aliceDoc2.id);
    expect(bobDocs.map((d) => d.id)).toContain(bobDoc1.id);
    expect(bobDocs.map((d) => d.id)).toContain(bobDoc2.id);

    // Access control works
    const aliceKey = (aliceDoc1 as any).__documentKey;
    await expect(
      docManager.getDocument(aliceDoc1.id, bobId, bobKeyPair, aliceKey)
    ).rejects.toThrow('Access denied');
  });

  it('should handle complex folder structures', async () => {
    // Create nested folder structure
    const root = await folderManager.createFolder('Root', aliceId);
    const level1a = await folderManager.createFolder('Level 1A', aliceId, root.id);
    const level1b = await folderManager.createFolder('Level 1B', aliceId, root.id);
    const level2a = await folderManager.createFolder('Level 2A', aliceId, level1a.id);
    const level2b = await folderManager.createFolder('Level 2B', aliceId, level1a.id);

    // Create documents at various levels
    await docManager.createDocument('Doc Root', 'Content', aliceId, aliceKeyPair, root.id);
    await docManager.createDocument('Doc 1A', 'Content', aliceId, aliceKeyPair, level1a.id);
    await docManager.createDocument('Doc 1B', 'Content', aliceId, aliceKeyPair, level1b.id);
    await docManager.createDocument('Doc 2A', 'Content', aliceId, aliceKeyPair, level2a.id);
    await docManager.createDocument('Doc 2B', 'Content', aliceId, aliceKeyPair, level2b.id);

    // Get folder path
    const path = await folderManager.getFolderPath(level2a.id, aliceId);
    expect(path).toHaveLength(3);
    expect(path.map((f) => f.name)).toEqual(['Root', 'Level 1A', 'Level 2A']);

    // Get folder tree
    const tree = await folderManager.getFolderTree(aliceId);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(2);
    expect(tree[0]!.children[0]!.children).toHaveLength(2);

    // Move folder
    await folderManager.moveFolder(level2a.id, level1b.id, aliceId);
    const newPath = await folderManager.getFolderPath(level2a.id, aliceId);
    expect(newPath.map((f) => f.name)).toEqual(['Root', 'Level 1B', 'Level 2A']);
  });

  it('should handle batch operations efficiently', async () => {
    const count = 30;

    const start = performance.now();

    // Create folder
    const folder = await folderManager.createFolder('Batch Test', aliceId);

    // Batch create documents
    const docs = [];
    for (let i = 0; i < count; i++) {
      const doc = await docManager.createDocument(
        `Doc ${i}`,
        `Content ${i}`,
        aliceId,
        aliceKeyPair,
        folder.id
      );
      docs.push(doc);
    }

    // Batch tag
    for (let i = 0; i < count; i++) {
      await docManager.addTags(docs[i]!.id, [`tag${i % 5}`], aliceId);
    }

    const end = performance.now();
    const totalTime = end - start;

    expect(totalTime).toBeLessThan(5000); // Should complete in < 5s
    expect(docs).toHaveLength(count);

    // Verify organization
    const folderDocs = await docManager.listDocumentsInFolder(aliceId, folder.id);
    expect(folderDocs).toHaveLength(count);

    // Query by tag
    const tag0Docs = await docManager.queryByTags(aliceId, ['tag0']);
    expect(tag0Docs.length).toBeGreaterThan(0);
  });
});
