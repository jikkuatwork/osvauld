/**
 * Browser Bundle Entry Point
 *
 * This file exports everything needed for the browser demo.
 */

// Import polyfills first
import './polyfills.js';

// Re-export all P2P functionality
export {
  WebRTCPeer,
  createInitiator,
  createResponder,
  connectLocalPeers,
} from '../src/p2p/webrtc-peer';

export {
  generateShareCode,
  parseShareCode,
  validateShareCode,
  extractPeerId,
  createConnectionOffer,
  acceptConnectionOffer,
  createConnectionAnswer,
  generateQRCode,
  generateQRCodeBuffer,
  SignalExchangeManager,
} from '../src/p2p/signaling';

export {
  ConnectionState,
  MessageType,
} from '../src/p2p/interface';

export type {
  IPeer,
  P2PMessage,
  PeerInfo,
  ConnectionStats,
} from '../src/p2p/interface';
