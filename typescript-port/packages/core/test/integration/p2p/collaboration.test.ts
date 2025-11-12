import { describe, it, expect } from 'vitest';
import { createYDoc, getYText, insertText, getText } from '../../../src/crdt/ydoc';
import { createMockPeerPair } from '../../../src/p2p/mock-peer';
import { P2PSyncManager } from '../../../src/p2p/sync';

describe('P2P Collaboration Integration', () => {
  it('should sync edits between two peers via mock P2P', async () => {
    // Create two Y.Docs for Alice and Bob
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    // Create P2P connection
    const [alicePeer, bobPeer] = createMockPeerPair();

    // Create sync managers
    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    // Start syncing
    aliceSync.startSync();
    bobSync.startSync();

    // Add peers
    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    // Wait for initial sync
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Alice makes an edit
    insertText(aliceText, 0, 'Hello from Alice');

    // Wait for sync
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Bob should see Alice's edit
    expect(getText(bobText)).toBe('Hello from Alice');

    // Bob makes an edit
    insertText(bobText, 17, ' and Bob');

    // Wait for sync
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Alice should see Bob's edit
    expect(getText(aliceText)).toBe('Hello from Alice and Bob');
  });

  it('should handle multiple peers (mesh network)', async () => {
    // Create three Y.Docs
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');
    const charlieDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);
    const charlieText = getYText(charlieDoc);

    // Create P2P connections
    const [alicePeer1, bobPeer1] = createMockPeerPair();
    const [alicePeer2, charliePeer1] = createMockPeerPair();
    const [bobPeer2, charliePeer2] = createMockPeerPair();

    // Create sync managers
    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);
    const charlieSync = new P2PSyncManager(charlieDoc);

    // Start syncing
    aliceSync.startSync();
    bobSync.startSync();
    charlieSync.startSync();

    // Connect all peers (mesh)
    aliceSync.addPeer(bobPeer1);
    aliceSync.addPeer(charliePeer1);
    bobSync.addPeer(alicePeer1);
    bobSync.addPeer(charliePeer2);
    charlieSync.addPeer(alicePeer2);
    charlieSync.addPeer(bobPeer2);

    // Wait for initial sync
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Alice makes an edit
    insertText(aliceText, 0, 'A');

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // All should have Alice's edit
    expect(getText(aliceText)).toContain('A');
    expect(getText(bobText)).toContain('A');
    expect(getText(charlieText)).toContain('A');

    // Bob makes an edit
    insertText(bobText, 1, 'B');

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // All should have same content
    const finalAlice = getText(aliceText);
    const finalBob = getText(bobText);
    const finalCharlie = getText(charlieText);

    expect(finalAlice).toBe(finalBob);
    expect(finalBob).toBe(finalCharlie);
  });

  it('should handle peer disconnect and reconnect', async () => {
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    // Create initial connection
    let [alicePeer, bobPeer] = createMockPeerPair();

    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    aliceSync.startSync();
    bobSync.startSync();

    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Alice makes edit while connected
    insertText(aliceText, 0, 'Before disconnect');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getText(bobText)).toBe('Before disconnect');

    // Simulate disconnect
    aliceSync.removePeer(bobPeer.id);
    bobSync.removePeer(alicePeer.id);

    // Make edits while disconnected
    insertText(aliceText, 18, ' - Alice offline');
    insertText(bobText, 18, ' - Bob offline');

    // Reconnect
    [alicePeer, bobPeer] = createMockPeerPair();
    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should sync offline edits
    const finalAlice = getText(aliceText);
    const finalBob = getText(bobText);

    expect(finalAlice).toBe(finalBob);
    expect(finalAlice).toContain('Before disconnect');
    expect(finalAlice).toContain('Alice offline');
    expect(finalAlice).toContain('Bob offline');
  });

  it('should handle rapid concurrent edits', async () => {
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    const [alicePeer, bobPeer] = createMockPeerPair();

    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    aliceSync.startSync();
    bobSync.startSync();

    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Both make rapid edits
    insertText(aliceText, 0, 'BASE');
    await new Promise((resolve) => setTimeout(resolve, 10));

    for (let i = 0; i < 5; i++) {
      insertText(aliceText, 4, `A${i}`);
      insertText(bobText, 4, `B${i}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Wait for full sync
    await new Promise((resolve) => setTimeout(resolve, 200));

    const finalAlice = getText(aliceText);
    const finalBob = getText(bobText);

    expect(finalAlice).toBe(finalBob);
    expect(finalAlice).toContain('BASE');
  });

  it('should track peer statistics', async () => {
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);

    const [alicePeer, bobPeer] = createMockPeerPair();

    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    aliceSync.startSync();
    bobSync.startSync();

    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Make several edits
    insertText(aliceText, 0, 'Edit 1');
    await new Promise((resolve) => setTimeout(resolve, 50));

    insertText(aliceText, 6, ' Edit 2');
    await new Promise((resolve) => setTimeout(resolve, 50));

    insertText(aliceText, 13, ' Edit 3');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const stats = alicePeer.getStats();

    expect(stats.messagesSent).toBeGreaterThan(0);
    expect(stats.bytesSent).toBeGreaterThan(0);
  });

  it('should handle empty document sync', async () => {
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    const [alicePeer, bobPeer] = createMockPeerPair();

    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    aliceSync.startSync();
    bobSync.startSync();

    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getText(aliceText)).toBe('');
    expect(getText(bobText)).toBe('');
  });

  it('should handle large document sync', async () => {
    const aliceDoc = createYDoc('doc-1');
    const bobDoc = createYDoc('doc-1');

    const aliceText = getYText(aliceDoc);
    const bobText = getYText(bobDoc);

    // Create large initial content
    const largeContent = 'x'.repeat(5000);
    insertText(aliceText, 0, largeContent);

    const [alicePeer, bobPeer] = createMockPeerPair();

    const aliceSync = new P2PSyncManager(aliceDoc);
    const bobSync = new P2PSyncManager(bobDoc);

    aliceSync.startSync();
    bobSync.startSync();

    aliceSync.addPeer(bobPeer);
    bobSync.addPeer(alicePeer);

    // Wait for sync
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(getText(bobText).length).toBe(5000);
    expect(getText(bobText)).toBe(largeContent);
  });
});
