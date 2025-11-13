/**
 * WebRTC Peer Tests
 *
 * Tests for real WebRTC peer implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WebRTCPeer,
  createInitiator,
  createResponder,
  connectLocalPeers,
} from '../../../src/p2p/webrtc-peer';
import {
  generateShareCode,
  parseShareCode,
  validateShareCode,
  extractPeerId,
  createConnectionOffer,
  acceptConnectionOffer,
} from '../../../src/p2p/signaling';
import { ConnectionState } from '../../../src/p2p/interface';
import type { P2PMessage } from '../../../src/p2p/interface';

// Check if wrtc is available (for Node.js testing)
let wrtc: any;
try {
  wrtc = require('wrtc');
} catch {
  // wrtc not available - WebRTC tests will be skipped
}

const hasWebRTC = typeof wrtc !== 'undefined' || typeof RTCPeerConnection !== 'undefined';

describe('WebRTC Peer', () => {
  describe('Peer Creation', () => {
    it('should create initiator peer', () => {
      const peer = createInitiator({ peerId: 'test-peer-1' });

      expect(peer).toBeDefined();
      expect(peer.id).toBe('test-peer-1');
      expect(peer.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should create responder peer', () => {
      const peer = createResponder({ peerId: 'test-peer-2' });

      expect(peer).toBeDefined();
      expect(peer.id).toBe('test-peer-2');
      expect(peer.state).toBe(ConnectionState.DISCONNECTED);
    });

    it('should generate UUID if no peerId provided', () => {
      const peer = createInitiator();

      expect(peer.id).toBeDefined();
      expect(peer.id.length).toBeGreaterThan(0);
    });
  });

  describe('Connection', () => {
    let peer1: WebRTCPeer;
    let peer2: WebRTCPeer;

    beforeEach(() => {
      peer1 = createInitiator({ peerId: 'peer1', wrtc });
      peer2 = createResponder({ peerId: 'peer2', wrtc });
    });

    afterEach(() => {
      peer1?.destroy();
      peer2?.destroy();
    });

    it.skipIf(!hasWebRTC)('should establish connection between two peers', async () => {
      const peer1Connected = new Promise((resolve) => {
        peer1.on('connect', resolve);
      });

      const peer2Connected = new Promise((resolve) => {
        peer2.on('connect', resolve);
      });

      await connectLocalPeers(peer1, peer2);

      await Promise.all([peer1Connected, peer2Connected]);

      expect(peer1.state).toBe(ConnectionState.CONNECTED);
      expect(peer2.state).toBe(ConnectionState.CONNECTED);
      expect(peer1.isConnected()).toBe(true);
      expect(peer2.isConnected()).toBe(true);
    }, 10000);

    it.skipIf(!hasWebRTC)('should emit connecting state', async () => {
      const connectingSpy = vi.fn();
      peer1.on('connecting', connectingSpy);

      // Start connection (will timeout, but we're just checking the event)
      peer1.connect().catch(() => {});

      // Wait a bit for the event
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectingSpy).toHaveBeenCalled();

      peer1.disconnect();
    });

    it.skipIf(!hasWebRTC)('should handle disconnection', async () => {
      await connectLocalPeers(peer1, peer2);

      const disconnectPromise = new Promise((resolve) => {
        peer1.on('disconnect', resolve);
      });

      peer1.disconnect();

      await disconnectPromise;

      expect(peer1.state).toBe(ConnectionState.DISCONNECTED);
      expect(peer1.isConnected()).toBe(false);
    }, 10000);
  });

  describe.skipIf(!hasWebRTC)('Messaging', () => {
    let peer1: WebRTCPeer;
    let peer2: WebRTCPeer;

    beforeEach(async () => {
      peer1 = createInitiator({ peerId: 'peer1', wrtc });
      peer2 = createResponder({ peerId: 'peer2', wrtc });
      await connectLocalPeers(peer1, peer2);
    }, 10000);

    afterEach(() => {
      peer1?.destroy();
      peer2?.destroy();
    });

    it('should send and receive messages', async () => {
      const testMessage: P2PMessage = {
        type: 'sync_request' as any,
        payload: { test: 'data' },
        timestamp: Date.now(),
        sender: 'peer1',
      };

      const messagePromise = new Promise<P2PMessage>((resolve) => {
        peer2.on('message', resolve);
      });

      await peer1.send(testMessage);

      const received = await messagePromise;

      expect(received.type).toBe(testMessage.type);
      expect(received.payload).toEqual(testMessage.payload);
      expect(received.sender).toBe(testMessage.sender);
    }, 10000);

    it('should track message statistics', async () => {
      const testMessage: P2PMessage = {
        type: 'update' as any,
        payload: 'test data',
        timestamp: Date.now(),
        sender: 'peer1',
      };

      await peer1.send(testMessage);

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats1 = peer1.getStats();
      const stats2 = peer2.getStats();

      expect(stats1.messagesSent).toBe(1);
      expect(stats1.bytesSent).toBeGreaterThan(0);
      expect(stats2.messagesReceived).toBe(1);
      expect(stats2.bytesReceived).toBeGreaterThan(0);
    }, 10000);

    it('should throw error when sending to disconnected peer', async () => {
      peer1.disconnect();

      const testMessage: P2PMessage = {
        type: 'update' as any,
        payload: 'test',
        timestamp: Date.now(),
        sender: 'peer1',
      };

      await expect(peer1.send(testMessage)).rejects.toThrow();
    }, 10000);
  });

  describe('Statistics', () => {
    it('should return connection statistics', () => {
      const peer = createInitiator();
      const stats = peer.getStats();

      expect(stats).toHaveProperty('bytesSent');
      expect(stats).toHaveProperty('bytesReceived');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('latency');
    });
  });
});

describe('Signaling', () => {
  describe('Share Code Generation', () => {
    it('should generate share code from signal', () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const shareCode = generateShareCode(peerId, signal as any);

      expect(shareCode).toBeDefined();
      expect(shareCode.length).toBeGreaterThan(0);
    });

    it('should parse share code', () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const shareCode = generateShareCode(peerId, signal as any);
      const parsed = parseShareCode(shareCode);

      expect(parsed.version).toBe(1);
      expect(parsed.peerId).toBe(peerId);
      expect(parsed.signal).toEqual(signal);
    });

    it('should validate share code', () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const shareCode = generateShareCode(peerId, signal as any);

      expect(validateShareCode(shareCode)).toBe(true);
      expect(validateShareCode('invalid')).toBe(false);
    });

    it('should extract peer ID from share code', () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const shareCode = generateShareCode(peerId, signal as any);
      const extracted = extractPeerId(shareCode);

      expect(extracted).toBe(peerId);
    });

    it('should throw error on invalid share code', () => {
      expect(() => parseShareCode('invalid')).toThrow();
    });
  });

  describe('QR Code Generation', () => {
    it('should create connection offer with QR code', async () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const { shareCode, qrCode } = await createConnectionOffer(peerId, signal as any);

      expect(shareCode).toBeDefined();
      expect(qrCode).toBeDefined();
      expect(qrCode.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should accept connection offer', () => {
      const peerId = 'test-peer';
      const signal = { type: 'offer', sdp: 'test-sdp' };

      const shareCode = generateShareCode(peerId, signal as any);
      const accepted = acceptConnectionOffer(shareCode);

      expect(accepted.peerId).toBe(peerId);
      expect(accepted.signal).toEqual(signal);
    });
  });

  describe('Share Code Roundtrip', () => {
    it('should preserve data through encode/decode', () => {
      const original = {
        peerId: 'test-peer-123',
        signal: {
          type: 'offer',
          sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n',
          candidate: {
            candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
            sdpMLineIndex: 0,
            sdpMid: '0',
          },
        },
      };

      const shareCode = generateShareCode(original.peerId, original.signal as any);
      const parsed = parseShareCode(shareCode);

      expect(parsed.peerId).toBe(original.peerId);
      expect(parsed.signal).toEqual(original.signal);
    });
  });
});
