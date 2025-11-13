/**
 * WebRTC Signaling
 *
 * Handles WebRTC signaling via QR codes and share codes for P2P connection establishment.
 */

import QRCode from 'qrcode';
import SimplePeer from 'simple-peer';
import { toBase64, fromBase64 } from '../crypto/buffer-utils';

/**
 * Share code format
 */
export interface ShareCode {
  /** Version for future compatibility */
  version: number;
  /** Peer ID */
  peerId: string;
  /** WebRTC signal data (offer/answer) */
  signal: SimplePeer.SignalData;
  /** Optional timestamp */
  timestamp?: number;
}

/**
 * Signaling options
 */
export interface SignalingOptions {
  /** QR code width (default: 400) */
  qrWidth?: number;
  /** QR code error correction level (default: 'M') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Default signaling options
 */
const DEFAULT_OPTIONS: Required<SignalingOptions> = {
  qrWidth: 400,
  errorCorrectionLevel: 'M',
};

/**
 * Generates a share code from WebRTC signal data
 */
export function generateShareCode(
  peerId: string,
  signal: SimplePeer.SignalData,
  timestamp?: number
): string {
  const shareCode: ShareCode = {
    version: 1,
    peerId,
    signal,
    timestamp: timestamp || Date.now(),
  };

  const json = JSON.stringify(shareCode);
  const base64 = toBase64(new TextEncoder().encode(json));

  return base64;
}

/**
 * Parses a share code back into signal data
 */
export function parseShareCode(code: string): ShareCode {
  try {
    const decoded = fromBase64(code);
    const json = new TextDecoder().decode(decoded);
    const shareCode = JSON.parse(json) as ShareCode;

    // Validate share code structure
    if (!shareCode.version || !shareCode.peerId || !shareCode.signal) {
      throw new Error('Invalid share code format');
    }

    return shareCode;
  } catch (error) {
    throw new Error(`Failed to parse share code: ${error}`);
  }
}

/**
 * Generates a QR code from a share code
 */
export async function generateQRCode(
  shareCode: string,
  options?: SignalingOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(shareCode, {
      width: opts.qrWidth,
      errorCorrectionLevel: opts.errorCorrectionLevel,
      margin: 2,
    });

    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

/**
 * Generates a QR code buffer (for Node.js / server-side)
 */
export async function generateQRCodeBuffer(
  shareCode: string,
  options?: SignalingOptions
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const buffer = await QRCode.toBuffer(shareCode, {
      width: opts.qrWidth,
      errorCorrectionLevel: opts.errorCorrectionLevel,
      margin: 2,
    });

    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate QR code buffer: ${error}`);
  }
}

/**
 * Signal exchange manager for WebRTC connections
 */
export class SignalExchangeManager {
  private signals: Map<string, SimplePeer.SignalData[]> = new Map();

  /**
   * Stores a signal for a peer
   */
  storeSignal(peerId: string, signal: SimplePeer.SignalData): void {
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
   * Gets the latest signal for a peer
   */
  getLatestSignal(peerId: string): SimplePeer.SignalData | undefined {
    const signals = this.signals.get(peerId);
    return signals && signals.length > 0 ? signals[signals.length - 1] : undefined;
  }

  /**
   * Clears signals for a peer
   */
  clearSignals(peerId: string): void {
    this.signals.delete(peerId);
  }

  /**
   * Clears all signals
   */
  clearAll(): void {
    this.signals.clear();
  }

  /**
   * Gets all peer IDs that have signals
   */
  getPeerIds(): string[] {
    return Array.from(this.signals.keys());
  }
}

/**
 * Creates a share code for initiating a connection
 */
export async function createConnectionOffer(
  peerId: string,
  signal: SimplePeer.SignalData
): Promise<{
  shareCode: string;
  qrCode: string;
}> {
  const shareCode = generateShareCode(peerId, signal);
  const qrCode = await generateQRCode(shareCode);

  return { shareCode, qrCode };
}

/**
 * Accepts a connection using a share code
 */
export function acceptConnectionOffer(shareCode: string): ShareCode {
  return parseShareCode(shareCode);
}

/**
 * Creates a response share code (answer to an offer)
 */
export async function createConnectionAnswer(
  peerId: string,
  signal: SimplePeer.SignalData
): Promise<{
  shareCode: string;
  qrCode: string;
}> {
  const shareCode = generateShareCode(peerId, signal);
  const qrCode = await generateQRCode(shareCode);

  return { shareCode, qrCode };
}

/**
 * Validates a share code
 */
export function validateShareCode(code: string): boolean {
  try {
    const shareCode = parseShareCode(code);
    return !!shareCode.peerId && !!shareCode.signal;
  } catch {
    return false;
  }
}

/**
 * Extracts peer ID from share code without full parsing
 */
export function extractPeerId(code: string): string | null {
  try {
    const shareCode = parseShareCode(code);
    return shareCode.peerId;
  } catch {
    return null;
  }
}

/**
 * Compresses share code (for smaller QR codes)
 */
export function compressShareCode(code: string): string {
  // Simple compression by removing unnecessary whitespace from JSON
  try {
    const shareCode = parseShareCode(code);
    const minified = JSON.stringify(shareCode);
    return toBase64(new TextEncoder().encode(minified));
  } catch {
    return code;
  }
}
