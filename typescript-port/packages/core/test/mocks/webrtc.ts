/**
 * WebRTC mock for testing
 *
 * Provides in-memory mock implementation of WebRTC for testing P2P
 * without requiring real network connections.
 */

import { EventEmitter } from 'events';

export type MockPeerMessage = {
  type: 'data' | 'signal';
  data: unknown;
};

/**
 * Mock WebRTC peer connection for testing
 */
export class MockPeerConnection extends EventEmitter {
  public id: string;
  public connected = false;
  private partner: MockPeerConnection | null = null;

  constructor(id: string) {
    super();
    this.id = id;
  }

  /**
   * Connect two mock peers together
   */
  connectTo(peer: MockPeerConnection): void {
    this.partner = peer;
    peer.partner = this;
    this.connected = true;
    peer.connected = true;
    this.emit('connect');
    peer.emit('connect');
  }

  /**
   * Send data to connected peer
   */
  send(data: unknown): void {
    if (!this.partner || !this.connected) {
      throw new Error('Not connected to peer');
    }
    // Simulate async message delivery
    setImmediate(() => {
      this.partner?.emit('data', data);
    });
  }

  /**
   * Disconnect from peer
   */
  disconnect(): void {
    if (this.partner) {
      this.partner.connected = false;
      this.partner.emit('disconnect');
      this.partner.partner = null;
    }
    this.connected = false;
    this.emit('disconnect');
    this.partner = null;
  }

  /**
   * Simulate connection error
   */
  simulateError(error: Error): void {
    this.emit('error', error);
  }
}

/**
 * Create a pair of connected mock peers
 */
export function createMockPeerPair(): [MockPeerConnection, MockPeerConnection] {
  const peer1 = new MockPeerConnection('peer1');
  const peer2 = new MockPeerConnection('peer2');
  peer1.connectTo(peer2);
  return [peer1, peer2];
}

/**
 * Mock WebRTC signaling for testing
 */
export class MockSignaling extends EventEmitter {
  private offers: Map<string, unknown> = new Map();

  sendOffer(id: string, offer: unknown): void {
    this.offers.set(id, offer);
    this.emit('offer', { id, offer });
  }

  getOffer(id: string): unknown | undefined {
    return this.offers.get(id);
  }

  clear(): void {
    this.offers.clear();
  }
}
