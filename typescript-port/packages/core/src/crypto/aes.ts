/**
 * AES-GCM encryption operations
 *
 * Provides authenticated encryption using AES-GCM (256-bit).
 * Uses Web Crypto API for secure, native implementation.
 */

import { toBase64, fromBase64, toHex, fromHex } from './buffer-utils';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag?: Uint8Array; // Auth tag (included in ciphertext by Web Crypto)
}

/**
 * Generate a new AES-GCM encryption key (256-bit)
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 *
 * @param data Data to encrypt (string or Uint8Array)
 * @param key AES-GCM key
 * @returns Encrypted data with IV
 */
export async function encrypt(
  data: string | Uint8Array,
  key: CryptoKey
): Promise<EncryptedData> {
  const dataBytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;

  // Generate random IV (12 bytes is recommended for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128, // 128-bit auth tag
    },
    key,
    dataBytes as BufferSource
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
  };
}

/**
 * Decrypt data using AES-GCM
 *
 * @param encrypted Encrypted data with IV
 * @param key AES-GCM key
 * @returns Decrypted data as Uint8Array
 */
export async function decrypt(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encrypted.iv as BufferSource,
        tagLength: 128,
      },
      key,
      encrypted.ciphertext as BufferSource
    );

    return new Uint8Array(decrypted);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt data and return as string
 */
export async function decryptString(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const decrypted = await decrypt(encrypted, key);
  return new TextDecoder().decode(decrypted);
}

/**
 * Export key as raw bytes
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Import key from raw bytes
 */
export async function importKey(keyData: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key as base64 string
 */
export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const keyBytes = await exportKey(key);
  return toBase64(keyBytes);
}

/**
 * Import key from base64 string
 */
export async function importKeyBase64(base64: string): Promise<CryptoKey> {
  const keyBytes = fromBase64(base64);
  return await importKey(keyBytes);
}

/**
 * Derive AES key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
