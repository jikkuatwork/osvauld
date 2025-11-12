/**
 * Mock Peer Implementation
 *
 * In-memory peer connection for sandbox testing.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  IPeer,
  P2PMessage,
  ConnectionState,
  ConnectionStats,
} from './interface';
import { ConnectionState as State } from './interface';

/**
 * Mock peer for testing
 */
export class MockPeer extends EventEmitter implements IPeer {
  id: string;
  state: ConnectionState;
  private partner?: MockPeer;
  private stats: ConnectionStats;

  constructor(id?: string) {
    super();
    this.id = id || uuidv4();
    this.state = State.DISCONNECTED;
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0,
      latency: 0,
    };
  }

  async connect(): Promise<void> {
    this.state = State.CONNECTING;
    this.emit('connecting');

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    this.state = State.CONNECTED;
    this.emit('connect');
  }

  disconnect(): void {
    this.state = State.DISCONNECTED;
    this.partner = undefined;
    this.emit('disconnect');
  }

  async send(message: P2PMessage): Promise<void> {
    if (this.state !== State.CONNECTED) {
      throw new Error('Peer not connected');
    }

    if (!this.partner) {
      throw new Error('No partner connected');
    }

    this.stats.messagesSent++;
    this.stats.bytesSent += JSON.stringify(message).length;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1));

    // Deliver to partner
    this.partner.receive(message);
  }

  private receive(message: P2PMessage): void {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += JSON.stringify(message).length;

    this.emit('message', message);
    this.emit('data', message);
  }

  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Connects two mock peers together
   */
  connectTo(peer: MockPeer): void {
    this.partner = peer;
    peer.partner = this;

    this.state = State.CONNECTED;
    peer.state = State.CONNECTED;

    this.emit('connect');
    peer.emit('connect');
  }

  /**
   * Simulates network failure
   */
  simulateDisconnect(): void {
    if (this.partner) {
      this.partner.state = State.DISCONNECTED;
      this.partner.partner = undefined;
      this.partner.emit('disconnect');
    }

    this.state = State.DISCONNECTED;
    this.partner = undefined;
    this.emit('disconnect');
  }

  /**
   * Simulates message loss
   */
  simulatePacketLoss(probability: number): void {
    const originalSend = this.send.bind(this);

    this.send = async (message: P2PMessage) => {
      if (Math.random() > probability) {
        await originalSend(message);
      }
      // Else: packet lost
    };
  }

  /**
   * Simulates network latency
   */
  simulateLatency(ms: number): void {
    this.stats.latency = ms;

    const originalSend = this.send.bind(this);

    this.send = async (message: P2PMessage) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await originalSend(message);
    };
  }
}

/**
 * Creates a connected pair of mock peers
 */
export function createMockPeerPair(): [MockPeer, MockPeer] {
  const peer1 = new MockPeer();
  const peer2 = new MockPeer();

  peer1.connectTo(peer2);

  return [peer1, peer2];
}

/**
 * Mock signaling server (in-memory)
 */
export class MockSignaling {
  private signals = new Map<string, unknown>();

  async generateShareCode(offer: unknown): Promise<string> {
    const code = Buffer.from(JSON.stringify(offer)).toString('base64').slice(0, 12);
    this.signals.set(code, offer);
    return code;
  }

  async parseShareCode(code: string): Promise<unknown> {
    const signal = this.signals.get(code);
    if (!signal) {
      throw new Error('Invalid share code');
    }
    return signal;
  }

  async exchangeSignal(peerId: string, signal: unknown): Promise<void> {
    this.signals.set(peerId, signal);
  }

  getSignal(peerId: string): unknown | undefined {
    return this.signals.get(peerId);
  }

  clear(): void {
    this.signals.clear();
  }
}
