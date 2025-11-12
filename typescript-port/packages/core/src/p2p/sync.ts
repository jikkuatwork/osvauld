/**
 * P2P Sync Protocol
 *
 * Handles synchronization of CRDT updates over P2P connections.
 */

import * as Y from 'yjs';
import type { IPeer, P2PMessage, MessageType } from './interface';
import { MessageType as MsgType } from './interface';

/**
 * Sync manager for P2P CRDT synchronization
 */
export class P2PSyncManager {
  private ydoc: Y.Doc;
  private peers: Map<string, IPeer>;
  private updateHandler?: (update: Uint8Array, origin: unknown) => void;

  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.peers = new Map();
  }

  /**
   * Adds a peer for synchronization
   */
  addPeer(peer: IPeer): void {
    this.peers.set(peer.id, peer);

    // Listen for messages from this peer
    peer.on('message', (message: P2PMessage) => {
      this.handleMessage(message, peer);
    });

    // Send initial sync to new peer
    this.sendInitialSync(peer);
  }

  /**
   * Removes a peer
   */
  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.removeAllListeners('message');
      this.peers.delete(peerId);
    }
  }

  /**
   * Starts syncing document updates
   */
  startSync(): void {
    // Listen for local document updates
    this.updateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't broadcast updates that came from peers
      if (origin !== 'peer') {
        this.broadcastUpdate(update);
      }
    };

    this.ydoc.on('update', this.updateHandler);
  }

  /**
   * Stops syncing
   */
  stopSync(): void {
    if (this.updateHandler) {
      this.ydoc.off('update', this.updateHandler);
      this.updateHandler = undefined;
    }
  }

  /**
   * Sends initial sync to a peer
   */
  private async sendInitialSync(peer: IPeer): Promise<void> {
    const stateVector = Y.encodeStateVector(this.ydoc);

    const message: P2PMessage = {
      type: MsgType.SYNC_REQUEST,
      payload: Buffer.from(stateVector).toString('base64'),
      timestamp: Date.now(),
      sender: 'self',
    };

    await peer.send(message);
  }

  /**
   * Handles incoming sync request
   */
  private async handleSyncRequest(stateVector: Uint8Array, peer: IPeer): Promise<void> {
    // Get updates the peer is missing
    const missingUpdates = Y.encodeStateAsUpdate(this.ydoc, stateVector);

    const message: P2PMessage = {
      type: MsgType.SYNC_RESPONSE,
      payload: Buffer.from(missingUpdates).toString('base64'),
      timestamp: Date.now(),
      sender: 'self',
    };

    await peer.send(message);

    // Also send our state vector to request their updates
    const ourStateVector = Y.encodeStateVector(this.ydoc);
    const requestMessage: P2PMessage = {
      type: MsgType.SYNC_REQUEST,
      payload: Buffer.from(ourStateVector).toString('base64'),
      timestamp: Date.now(),
      sender: 'self',
    };

    await peer.send(requestMessage);
  }

  /**
   * Handles incoming sync response
   */
  private handleSyncResponse(updates: Uint8Array): void {
    if (updates.byteLength > 0) {
      Y.applyUpdate(this.ydoc, updates, 'peer');
    }
  }

  /**
   * Handles incoming update
   */
  private handleUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update, 'peer');
  }

  /**
   * Broadcasts update to all peers
   */
  private async broadcastUpdate(update: Uint8Array): Promise<void> {
    const message: P2PMessage = {
      type: MsgType.UPDATE,
      payload: Buffer.from(update).toString('base64'),
      timestamp: Date.now(),
      sender: 'self',
    };

    const promises = Array.from(this.peers.values()).map((peer) => peer.send(message));
    await Promise.allSettled(promises);
  }

  /**
   * Handles incoming message
   */
  private handleMessage(message: P2PMessage, peer: IPeer): void {
    try {
      const payload = Buffer.from(message.payload as string, 'base64');

      switch (message.type) {
        case MsgType.SYNC_REQUEST:
          this.handleSyncRequest(payload, peer);
          break;

        case MsgType.SYNC_RESPONSE:
          this.handleSyncResponse(payload);
          break;

        case MsgType.UPDATE:
          this.handleUpdate(payload);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Gets connected peer count
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Gets all peer IDs
   */
  getPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }
}

/**
 * Creates a sync manager
 */
export function createSyncManager(ydoc: Y.Doc): P2PSyncManager {
  return new P2PSyncManager(ydoc);
}

/**
 * Sends update to specific peer
 */
export async function sendUpdate(peer: IPeer, update: Uint8Array): Promise<void> {
  const message: P2PMessage = {
    type: MsgType.UPDATE,
    payload: Buffer.from(update).toString('base64'),
    timestamp: Date.now(),
    sender: 'self',
  };

  await peer.send(message);
}

/**
 * Handles update from peer
 */
export function handleUpdate(ydoc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(ydoc, update, origin);
}
