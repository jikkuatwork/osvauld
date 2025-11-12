import { describe, it, expect } from 'vitest';
import { generateKey } from '../../../src/crypto/aes';
import {
  createYDoc,
  getYText,
  insertText,
  deleteText,
  getText,
  subscribeToUpdates,
} from '../../../src/crdt/ydoc';
import { syncDocs, applyUpdate } from '../../../src/crdt/sync';
import {
  saveEncryptedState,
  loadEncryptedState,
  serializeEncryptedState,
  deserializeEncryptedState,
} from '../../../src/crdt/persistence';
import * as Y from 'yjs';

describe('CRDT Collaboration Integration', () => {
  it('should sync edits between two users via update exchange', async () => {
    // Simulate two users with their own Y.Docs
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');
    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    // Both start with same initial content
    insertText(aliceText, 0, 'Shared document');

    const initialUpdate = Y.encodeStateAsUpdate(aliceDoc);
    applyUpdate(bobDoc, initialUpdate);

    expect(getText(bobText)).toBe('Shared document');

    // Alice makes an edit
    const aliceUpdates: Uint8Array[] = [];
    subscribeToUpdates(aliceDoc, (update) => {
      aliceUpdates.push(update);
    });

    insertText(aliceText, 17, ' - Alice edit');

    // Send Alice's update to Bob
    applyUpdate(bobDoc, aliceUpdates[0]!);

    expect(getText(bobText)).toBe('Shared document - Alice edit');
  });

  it('should merge concurrent edits without conflicts', async () => {
    const doc1 = createYDoc('doc-1');
    const doc2 = createYDoc('doc-1');
    const text1 = getYText(doc1);
    const text2 = getYText(doc2);

    // Both start with same content
    insertText(text1, 0, 'Base text');
    const baseUpdate = Y.encodeStateAsUpdate(doc1);
    applyUpdate(doc2, baseUpdate);

    // Concurrent edits at different positions
    insertText(text1, 0, 'Prefix ');
    insertText(text2, 9, ' Suffix');

    // Sync documents
    syncDocs(doc1, doc2);

    // Both should have merged content
    const merged1 = getText(text1);
    const merged2 = getText(text2);

    expect(merged1).toBe(merged2);
    expect(merged1).toContain('Prefix');
    expect(merged1).toContain('Base text');
    expect(merged1).toContain('Suffix');
  });

  it('should handle multiple peers syncing', async () => {
    const alice = createYDoc('doc-1');
    const bob = createYDoc('doc-1');
    const charlie = createYDoc('doc-1');

    const aliceText = getYText(alice);
    const bobText = getYText(bob);
    const charlieText = getYText(charlie);

    // Alice creates initial content
    insertText(aliceText, 0, 'Start');

    // Sync Alice → Bob
    const update1 = Y.encodeStateAsUpdate(alice);
    applyUpdate(bob, update1);

    // Sync Alice → Charlie
    applyUpdate(charlie, update1);

    // All make concurrent edits
    insertText(aliceText, 5, ' A');
    insertText(bobText, 5, ' B');
    insertText(charlieText, 5, ' C');

    // Full mesh sync
    syncDocs(alice, bob);
    syncDocs(bob, charlie);
    syncDocs(alice, charlie);

    // All should have same content
    const finalA = getText(aliceText);
    const finalB = getText(bobText);
    const finalC = getText(charlieText);

    expect(finalA).toBe(finalB);
    expect(finalB).toBe(finalC);
    expect(finalA.length).toBeGreaterThanOrEqual(8); // Start + A + B + C
  });

  it('should encrypt updates and maintain sync', async () => {
    const doc1 = createYDoc('doc-1');
    const doc2 = createYDoc('doc-1');
    const text1 = getYText(doc1);

    // Create content
    insertText(text1, 0, 'Encrypted collaborative content');

    // Save encrypted
    const key = await generateKey();
    const encrypted = await saveEncryptedState(doc1, 'doc-1', key);

    // Load on another peer
    const loaded = await loadEncryptedState(encrypted, key);
    const loadedText = getYText(loaded);

    expect(getText(loadedText)).toBe('Encrypted collaborative content');

    // Continue editing on loaded doc
    insertText(loadedText, 31, ' - more edits');

    // Sync back
    const update = Y.encodeStateAsUpdate(loaded);
    applyUpdate(doc1, update);

    expect(getText(text1)).toBe('Encrypted collaborative content - more edits');
  });

  it('should persist and restore collaborative session', async () => {
    const session1 = createYDoc('doc-1');
    const text1 = getYText(session1);

    // Multiple edits in session
    insertText(text1, 0, 'Line 1');
    insertText(text1, 6, '\\nLine 2');
    insertText(text1, 14, '\\nLine 3');

    // Save session
    const key = await generateKey();
    const saved = await saveEncryptedState(session1, 'doc-1', key);
    const serialized = serializeEncryptedState(saved);

    // Simulate closing and reopening
    const deserialized = deserializeEncryptedState(serialized);
    const session2 = await loadEncryptedState(deserialized, key);
    const text2 = getYText(session2);

    // Continue editing
    insertText(text2, 22, '\\nLine 4');

    expect(getText(text2)).toBe('Line 1\\nLine 2\\nLine 3\\nLine 4');
  });

  it('should handle deletions correctly across peers', async () => {
    const doc1 = createYDoc('doc-1');
    const doc2 = createYDoc('doc-1');
    const text1 = getYText(doc1);
    const text2 = getYText(doc2);

    // Start with same content
    insertText(text1, 0, 'ABCDEFGHIJ');
    const init = Y.encodeStateAsUpdate(doc1);
    applyUpdate(doc2, init);

    // Peer 1 deletes from middle
    deleteText(text1, 2, 3); // Delete CDE

    // Peer 2 also edits
    insertText(text2, 10, 'K');

    // Sync
    syncDocs(doc1, doc2);

    const final1 = getText(text1);
    const final2 = getText(text2);

    expect(final1).toBe(final2);
    expect(final1).toBe('ABFGHIJK');
  });

  it('should handle rapid concurrent insertions', async () => {
    const doc1 = createYDoc('doc-1');
    const doc2 = createYDoc('doc-1');
    const text1 = getYText(doc1);
    const text2 = getYText(doc2);

    // Start synced
    insertText(text1, 0, 'BASE');
    syncDocs(doc1, doc2);

    // Rapid insertions
    for (let i = 0; i < 10; i++) {
      insertText(text1, 4, `1${i}`);
      insertText(text2, 4, `2${i}`);
    }

    // Sync
    syncDocs(doc1, doc2);

    const final1 = getText(text1);
    const final2 = getText(text2);

    expect(final1).toBe(final2);
    expect(final1).toContain('BASE');
  });

  it('should handle offline editing and reconnection', async () => {
    const online = createYDoc('doc-1');
    const offline = createYDoc('doc-1');
    const onlineText = getYText(online);
    const offlineText = getYText(offline);

    // Start synced
    insertText(onlineText, 0, 'Initial content');
    syncDocs(online, offline);

    // Offline edits on both
    insertText(onlineText, 15, ' - online edit 1');
    insertText(offlineText, 15, ' - offline edit 1');

    insertText(onlineText, 31, ' - online edit 2');
    insertText(offlineText, 32, ' - offline edit 2');

    // Reconnect and sync
    syncDocs(online, offline);

    const finalOnline = getText(onlineText);
    const finalOffline = getText(offlineText);

    expect(finalOnline).toBe(finalOffline);
    expect(finalOnline).toContain('Initial content');
    expect(finalOnline).toContain('online edit 1');
    expect(finalOnline).toContain('offline edit 1');
  });

  it('should maintain consistency with complex edits', async () => {
    const peers = [
      createYDoc('doc-1'),
      createYDoc('doc-1'),
      createYDoc('doc-1'),
    ];

    const texts = peers.map((doc) => getYText(doc));

    // Initialize
    insertText(texts[0]!, 0, 'START');
    for (let i = 1; i < peers.length; i++) {
      syncDocs(peers[0]!, peers[i]!);
    }

    // Complex edits
    insertText(texts[0]!, 0, 'A');
    insertText(texts[1]!, 5, 'B');
    insertText(texts[2]!, 0, 'C');

    deleteText(texts[0]!, 1, 1);
    insertText(texts[1]!, 0, 'D');

    // Full sync
    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        syncDocs(peers[i]!, peers[j]!);
      }
    }

    // All should match
    const contents = texts.map((text) => getText(text));
    expect(contents[0]).toBe(contents[1]);
    expect(contents[1]).toBe(contents[2]);
  });

  it('should handle large documents in collaboration', async () => {
    const doc1 = createYDoc('doc-1');
    const doc2 = createYDoc('doc-1');
    const text1 = getYText(doc1);
    const text2 = getYText(doc2);

    // Create large initial content
    const largeContent = 'x'.repeat(5000);
    insertText(text1, 0, largeContent);

    const start = performance.now();

    // Sync to second doc
    syncDocs(doc1, doc2);

    // Both make edits
    insertText(text1, 0, 'START ');
    insertText(text2, 5000, ' END');

    // Sync again
    syncDocs(doc1, doc2);

    const end = performance.now();

    expect(getText(text1)).toBe(getText(text2));
    expect(getText(text1)).toContain('START');
    expect(getText(text1)).toContain(' END');
    expect(end - start).toBeLessThan(500); // Should be reasonably fast
  });
});
