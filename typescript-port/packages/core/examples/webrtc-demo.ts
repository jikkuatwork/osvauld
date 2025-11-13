/**
 * WebRTC P2P Demo
 *
 * This example demonstrates how to establish a peer-to-peer WebRTC connection
 * using QR code based signaling.
 *
 * Usage:
 * 1. Run this on two different machines/browsers
 * 2. Machine A generates a QR code (initiator)
 * 3. Machine B scans the QR code and connects (responder)
 * 4. Both machines can now exchange messages directly
 */

import {
  createInitiator,
  createResponder,
  type WebRTCPeer,
} from '../src/p2p/webrtc-peer';
import {
  createConnectionOffer,
  parseShareCode,
  generateShareCode,
  generateQRCode,
} from '../src/p2p/signaling';
import type { P2PMessage } from '../src/p2p/interface';
import * as Y from 'yjs';
import { P2PSyncManager } from '../src/p2p/sync';

/**
 * Example: Initiator creates a connection offer
 */
async function initiatorExample() {
  console.log('=== INITIATOR (Machine A) ===\n');

  // 1. Create an initiator peer
  const peer = createInitiator({
    peerId: 'machine-a',
  });

  console.log('Created peer with ID:', peer.id);

  // 2. Set up signal handler to generate QR code
  peer.on('signal', async (signal) => {
    console.log('Generated WebRTC signal');

    // Create share code and QR code
    const { shareCode, qrCode } = await createConnectionOffer(peer.id, signal);

    console.log('\n📱 SHARE CODE (copy this or scan QR code):');
    console.log(shareCode);
    console.log('\n🔲 QR CODE (base64 data URL):');
    console.log(qrCode.substring(0, 100) + '...');
    console.log('\nSend this share code to Machine B\n');
  });

  // 3. Set up connection handlers
  peer.on('connect', () => {
    console.log('✅ Connected to peer!');
  });

  peer.on('message', (message: P2PMessage) => {
    console.log('📨 Received message:', message);
  });

  peer.on('disconnect', () => {
    console.log('❌ Disconnected from peer');
  });

  peer.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // 4. Start connection process
  console.log('Initiating connection...\n');
  await peer.connect().catch(console.error);

  return peer;
}

/**
 * Example: Responder accepts a connection offer
 */
async function responderExample(shareCode: string) {
  console.log('=== RESPONDER (Machine B) ===\n');

  // 1. Parse the share code
  const { peerId: remotePeerId, signal: remoteSignal } = parseShareCode(shareCode);
  console.log('Parsed share code from peer:', remotePeerId);

  // 2. Create a responder peer
  const peer = createResponder({
    peerId: 'machine-b',
  });

  console.log('Created peer with ID:', peer.id);

  // 3. Set up signal handler to send answer back
  peer.on('signal', async (signal) => {
    console.log('Generated answer signal');

    // Create answer share code (to send back to Machine A)
    const answerCode = generateShareCode(peer.id, signal);
    console.log('\n📱 ANSWER CODE (send this back to Machine A):');
    console.log(answerCode);
  });

  // 4. Set up connection handlers
  peer.on('connect', () => {
    console.log('✅ Connected to peer!');
  });

  peer.on('message', (message: P2PMessage) => {
    console.log('📨 Received message:', message);
  });

  peer.on('disconnect', () => {
    console.log('❌ Disconnected from peer');
  });

  peer.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  // 5. Start connection with remote signal
  console.log('Connecting to peer...\n');
  peer.signal(remoteSignal);
  await peer.connect().catch(console.error);

  return peer;
}

/**
 * Example: Complete flow with answer handling
 */
async function completeConnectionFlow() {
  console.log('=== COMPLETE CONNECTION FLOW ===\n');

  // This simulates the full flow, but in practice each peer would be on different machines

  // Step 1: Initiator creates offer
  const initiator = createInitiator({ peerId: 'peer-1' });

  let initiatorSignal: any;
  initiator.on('signal', (signal) => {
    initiatorSignal = signal;
    console.log('Initiator: Generated signal');
  });

  await initiator.connect().catch(() => {}); // Will timeout, but that's OK for this demo

  // Step 2: Generate share code
  if (initiatorSignal) {
    const { shareCode, qrCode } = await createConnectionOffer(initiator.id, initiatorSignal);
    console.log('\n✅ Share code generated:', shareCode.substring(0, 50) + '...');

    // Step 3: Responder parses and accepts
    const { peerId, signal } = parseShareCode(shareCode);
    console.log('✅ Responder parsed offer from:', peerId);

    // Step 4: Responder creates answer
    const responder = createResponder({ peerId: 'peer-2' });

    let responderSignal: any;
    responder.on('signal', (signal) => {
      responderSignal = signal;
      console.log('Responder: Generated answer signal');
    });

    // Signal the responder with initiator's offer
    responder.signal(signal);
    await responder.connect().catch(() => {});

    // Step 5: Initiator receives answer
    if (responderSignal) {
      initiator.signal(responderSignal);
      console.log('✅ Connection established!');
    }
  }
}

/**
 * Example: Using WebRTC with CRDT sync
 */
async function crdtSyncExample(peer1: WebRTCPeer, peer2: WebRTCPeer) {
  console.log('\n=== CRDT SYNC EXAMPLE ===\n');

  // Create Y.Docs for both peers
  const ydoc1 = new Y.Doc();
  const ydoc2 = new Y.Doc();

  // Create sync managers
  const sync1 = new P2PSyncManager(ydoc1);
  const sync2 = new P2PSyncManager(ydoc2);

  // Add peers to sync managers
  sync1.addPeer(peer1);
  sync2.addPeer(peer2);

  // Start syncing
  sync1.startSync();
  sync2.startSync();

  // Make changes to document 1
  const text1 = ydoc1.getText('content');
  text1.insert(0, 'Hello from Peer 1!');

  console.log('Peer 1 wrote:', text1.toString());

  // Wait for sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check document 2
  const text2 = ydoc2.getText('content');
  console.log('Peer 2 received:', text2.toString());

  console.log('✅ CRDT sync working!');
}

/**
 * Example: Sending custom messages
 */
async function customMessagingExample(peer: WebRTCPeer) {
  console.log('\n=== CUSTOM MESSAGING EXAMPLE ===\n');

  // Send a custom message
  const message: P2PMessage = {
    type: 'update' as any,
    payload: {
      action: 'document_update',
      documentId: 'doc-123',
      changes: ['added paragraph', 'fixed typo'],
    },
    timestamp: Date.now(),
    sender: peer.id,
  };

  console.log('Sending message:', message);
  await peer.send(message);
  console.log('✅ Message sent!');
}

// Export examples
export {
  initiatorExample,
  responderExample,
  completeConnectionFlow,
  crdtSyncExample,
  customMessagingExample,
};

/**
 * Browser-friendly demo function
 *
 * Usage in browser console:
 * ```javascript
 * // Machine A
 * const { initiator, shareCode } = await window.osvauld.demo.createInitiator();
 * console.log('Share this code:', shareCode);
 *
 * // Machine B
 * const responder = await window.osvauld.demo.connectToInitiator(shareCode);
 *
 * // Send messages
 * await initiator.send({ type: 'update', payload: 'Hello!', timestamp: Date.now(), sender: 'A' });
 * ```
 */
export async function browserDemo() {
  // This would be exposed in a browser environment
  return {
    createInitiator: async () => {
      const peer = createInitiator();
      let shareCode = '';

      const signalPromise = new Promise<string>((resolve) => {
        peer.on('signal', async (signal) => {
          const { shareCode: code } = await createConnectionOffer(peer.id, signal);
          shareCode = code;
          resolve(code);
        });
      });

      peer.connect().catch(console.error);

      await signalPromise;

      return { peer, shareCode };
    },

    connectToInitiator: async (shareCode: string) => {
      const { signal: remoteSignal } = parseShareCode(shareCode);
      const peer = createResponder();

      peer.on('signal', async (signal) => {
        const answerCode = generateShareCode(peer.id, signal);
        console.log('Send this answer code back:', answerCode);
      });

      peer.signal(remoteSignal);
      await peer.connect();

      return peer;
    },

    handleAnswer: (peer: WebRTCPeer, answerCode: string) => {
      const { signal } = parseShareCode(answerCode);
      peer.signal(signal);
    },
  };
}
