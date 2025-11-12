/**
 * Ed25519 cryptographic operations
 *
 * Provides digital signature functionality using the Ed25519 algorithm.
 * Uses @noble/ed25519 library for secure, audited implementation.
 */

import * as ed from '@noble/ed25519';

/**
 * Ed25519 key pair
 */
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generate a new Ed25519 key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Sign a message with a private key
 *
 * @param message Message to sign (will be converted to Uint8Array)
 * @param privateKey Ed25519 private key
 * @returns Signature as Uint8Array
 */
export async function sign(
  message: string | Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  const messageBytes =
    typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

  return await ed.signAsync(messageBytes, privateKey);
}

/**
 * Verify a signature
 *
 * @param signature Signature to verify
 * @param message Original message
 * @param publicKey Ed25519 public key
 * @returns true if signature is valid
 */
export async function verify(
  signature: Uint8Array,
  message: string | Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  const messageBytes =
    typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

  try {
    return await ed.verifyAsync(signature, messageBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Export public key as hex string
 */
export function publicKeyToHex(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString('hex');
}

/**
 * Import public key from hex string
 */
export function publicKeyFromHex(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

/**
 * Export private key as hex string (use carefully!)
 */
export function privateKeyToHex(privateKey: Uint8Array): string {
  return Buffer.from(privateKey).toString('hex');
}

/**
 * Import private key from hex string
 */
export function privateKeyFromHex(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}
