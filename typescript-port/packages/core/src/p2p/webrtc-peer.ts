/**
 * Real WebRTC Peer Implementation
 *
 * Uses simple-peer for real WebRTC connections with STUN/TURN support.
 */

import SimplePeer from 'simple-peer';
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
 * WebRTC configuration
 */
export interface WebRTCConfig {
  /** STUN/TURN servers */
  iceServers?: RTCIceServer[];
  /** Whether this peer initiates the connection */
  initiator: boolean;
  /** Optional peer ID */
  peerId?: string;
  /** Trickle ICE (default: true) */
  trickle?: boolean;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** WebRTC implementation (for Node.js, pass wrtc module) */
  wrtc?: any;
}

/**
 * Signal data for WebRTC handshake
 */
export interface SignalData {
  type: 'offer' | 'answer';
  sdp?: string;
  candidate?: RTCIceCandidate;
}

/**
 * Default ICE servers (public STUN servers)
 */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * Real WebRTC peer using simple-peer
 */
export class WebRTCPeer extends EventEmitter implements IPeer {
  id: string;
  state: ConnectionState;

  private peer: SimplePeer.Instance | null = null;
  private config: WebRTCConfig;
  private stats: ConnectionStats;
  private connectionTimeout?: NodeJS.Timeout;
  private lastPingTime: number = 0;

  constructor(config: WebRTCConfig) {
    super();
    this.id = config.peerId || uuidv4();
    this.state = State.DISCONNECTED;
    this.config = {
      iceServers: DEFAULT_ICE_SERVERS,
      trickle: true,
      connectionTimeout: 30000,
      ...config,
    };
    this.stats = {
      bytesSent: 0,
      bytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0,
      latency: 0,
    };
  }

  /**
   * Initiates WebRTC connection
   */
  async connect(): Promise<void> {
    if (this.peer) {
      throw new Error('Peer already initialized');
    }

    this.state = State.CONNECTING;
    this.emit('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Create SimplePeer instance
        const peerOptions: SimplePeer.Options = {
          initiator: this.config.initiator,
          trickle: this.config.trickle ?? true,
          config: {
            iceServers: this.config.iceServers,
          },
        };

        // Add wrtc if provided (for Node.js testing)
        if (this.config.wrtc) {
          peerOptions.wrtc = this.config.wrtc;
        }

        this.peer = new SimplePeer(peerOptions);

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          this.state = State.FAILED;
          this.emit('error', new Error('Connection timeout'));
          this.disconnect();
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        // Handle signaling data (to be sent to remote peer)
        this.peer.on('signal', (data: SimplePeer.SignalData) => {
          this.emit('signal', data);
        });

        // Handle connection established
        this.peer.on('connect', () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = undefined;
          }
          this.state = State.CONNECTED;
          this.emit('connect');
          resolve();
        });

        // Handle incoming data
        this.peer.on('data', (data: Uint8Array) => {
          try {
            const message = JSON.parse(data.toString()) as P2PMessage;
            this.stats.messagesReceived++;
            this.stats.bytesReceived += data.byteLength;

            // Handle ping/pong for latency measurement
            if (message.type === 'pong' as any) {
              this.stats.latency = Date.now() - this.lastPingTime;
            }

            this.emit('message', message);
            this.emit('data', message);
          } catch (error) {
            this.emit('error', new Error(`Failed to parse message: ${error}`));
          }
        });

        // Handle errors
        this.peer.on('error', (err: Error) => {
          this.state = State.FAILED;
          this.emit('error', err);
          reject(err);
        });

        // Handle disconnection
        this.peer.on('close', () => {
          this.state = State.DISCONNECTED;
          this.emit('disconnect');
          this.peer = null;
        });

      } catch (error) {
        this.state = State.FAILED;
        reject(error);
      }
    });
  }

  /**
   * Signals remote peer data (for WebRTC handshake)
   */
  signal(data: SimplePeer.SignalData): void {
    if (!this.peer) {
      throw new Error('Peer not initialized. Call connect() first.');
    }
    this.peer.signal(data);
  }

  /**
   * Disconnects from peer
   */
  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = undefined;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.state = State.DISCONNECTED;
    this.emit('disconnect');
  }

  /**
   * Sends message to peer
   */
  async send(message: P2PMessage): Promise<void> {
    if (this.state !== State.CONNECTED || !this.peer) {
      throw new Error('Peer not connected');
    }

    const data = JSON.stringify(message);
    const bytes = new TextEncoder().encode(data);

    return new Promise((resolve, reject) => {
      try {
        this.peer!.send(bytes);
        this.stats.messagesSent++;
        this.stats.bytesSent += bytes.byteLength;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Measures connection latency
   */
  async ping(): Promise<number> {
    if (this.state !== State.CONNECTED) {
      throw new Error('Peer not connected');
    }

    this.lastPingTime = Date.now();

    const pingMessage: P2PMessage = {
      type: 'ping' as any,
      payload: null,
      timestamp: this.lastPingTime,
      sender: this.id,
    };

    await this.send(pingMessage);

    // Wait for pong (timeout after 5s)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      const pongHandler = () => {
        clearTimeout(timeout);
        this.off('message', pongHandler);
        resolve(this.stats.latency);
      };

      this.on('message', (msg: P2PMessage) => {
        if (msg.type === 'pong' as any) {
          pongHandler();
        }
      });
    });
  }

  /**
   * Gets connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Checks if peer is connected
   */
  isConnected(): boolean {
    return this.state === State.CONNECTED && this.peer !== null;
  }

  /**
   * Destroys the peer connection
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}

/**
 * Creates a WebRTC peer as initiator (creates offer)
 */
export function createInitiator(config?: Partial<WebRTCConfig>): WebRTCPeer {
  return new WebRTCPeer({
    initiator: true,
    ...config,
  });
}

/**
 * Creates a WebRTC peer as responder (receives offer)
 */
export function createResponder(config?: Partial<WebRTCConfig>): WebRTCPeer {
  return new WebRTCPeer({
    initiator: false,
    ...config,
  });
}

/**
 * Helper to exchange signals between peers (for testing)
 */
export class SignalExchange {
  private signals: Map<string, SimplePeer.SignalData[]> = new Map();

  /**
   * Stores signal from a peer
   */
  addSignal(peerId: string, signal: SimplePeer.SignalData): void {
    if (!this.signals.has(peerId)) {
      this.signals.set(peerId, []);
    }
    this.signals.get(peerId)!.push(signal);
  }

  /**
   * Gets all signals for a peer
   */
  getSignals(peerId: string): SimplePeer.SignalData[] {
    return this.signals.get(peerId) || [];
  }

  /**
   * Clears all signals
   */
  clear(): void {
    this.signals.clear();
  }
}

/**
 * Helper to establish connection between two local peers (for testing)
 */
export async function connectLocalPeers(
  peer1: WebRTCPeer,
  peer2: WebRTCPeer
): Promise<void> {
  // Exchange signals between peers
  peer1.on('signal', (signal) => {
    peer2.signal(signal);
  });

  peer2.on('signal', (signal) => {
    peer1.signal(signal);
  });

  // Connect both peers
  await Promise.all([peer1.connect(), peer2.connect()]);
}
