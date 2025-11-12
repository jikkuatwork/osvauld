/**
 * P2P Interfaces
 *
 * Defines interfaces for peer-to-peer connections.
 */

import { EventEmitter } from 'events';

/**
 * Peer connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

/**
 * Message types
 */
export enum MessageType {
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',
  UPDATE = 'update',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * P2P message structure
 */
export interface P2PMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  sender: string;
}

/**
 * Peer information
 */
export interface PeerInfo {
  id: string;
  name?: string;
  publicKey?: Uint8Array;
  connected: boolean;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
  latency: number;
}

/**
 * IPeer interface
 */
export interface IPeer extends EventEmitter {
  id: string;
  state: ConnectionState;

  connect(): Promise<void>;
  disconnect(): void;
  send(message: P2PMessage): Promise<void>;
  getStats(): ConnectionStats;
}

/**
 * IConnection interface
 */
export interface IConnection {
  peerId: string;
  state: ConnectionState;
  createdAt: Date;
  lastMessageAt?: Date;

  send(data: unknown): Promise<void>;
  close(): void;
}

/**
 * ISignaling interface for discovery
 */
export interface ISignaling {
  generateShareCode(offer: unknown): Promise<string>;
  parseShareCode(code: string): Promise<unknown>;
  exchangeSignal(peerId: string, signal: unknown): Promise<void>;
}
