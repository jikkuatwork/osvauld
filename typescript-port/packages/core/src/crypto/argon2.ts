/**
 * Argon2 key derivation
 *
 * Provides password-based key derivation using Argon2id.
 * Uses @noble/hashes for implementation.
 */

import { argon2id } from '@noble/hashes/argon2';

/**
 * Argon2 parameters
 */
export interface Argon2Params {
  /** Memory size in KiB (default: 65536 = 64MB) */
  memoryCost?: number;
  /** Number of iterations (default: 3) */
  timeCost?: number;
  /** Parallelism factor (default: 4) */
  parallelism?: number;
}

/**
 * Default Argon2 parameters
 * Balanced for security and performance
 */
export const DEFAULT_PARAMS: Required<Argon2Params> = {
  memoryCost: 65536, // 64MB
  timeCost: 3,
  parallelism: 1, // Changed to 1 for compatibility
};

/**
 * Generate a random salt for Argon2
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive a key from a password using Argon2id
 *
 * @param password Password string
 * @param salt Salt (16 bytes recommended)
 * @param params Argon2 parameters
 * @returns Derived key (32 bytes)
 */
export function deriveKey(
  password: string,
  salt: Uint8Array,
  params: Argon2Params = {}
): Uint8Array {
  const { memoryCost, timeCost, parallelism } = {
    ...DEFAULT_PARAMS,
    ...params,
  };

  return argon2id(password, salt, {
    m: memoryCost,
    t: timeCost,
    p: parallelism,
    dkLen: 32, // 256-bit key
  });
}

/**
 * Verify a password against a derived key
 *
 * @param password Password to verify
 * @param salt Salt used for derivation
 * @param expectedKey Expected derived key
 * @param params Argon2 parameters (must match derivation)
 * @returns true if password matches
 */
export function verifyPassword(
  password: string,
  salt: Uint8Array,
  expectedKey: Uint8Array,
  params: Argon2Params = {}
): boolean {
  const derivedKey = deriveKey(password, salt, params);

  // Constant-time comparison
  if (derivedKey.length !== expectedKey.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < derivedKey.length; i++) {
    diff |= derivedKey[i]! ^ expectedKey[i]!;
  }

  return diff === 0;
}

/**
 * Export salt and key as base64 strings
 */
export function exportDerivedKey(salt: Uint8Array, key: Uint8Array) {
  return {
    salt: Buffer.from(salt).toString('base64'),
    key: Buffer.from(key).toString('base64'),
  };
}

/**
 * Import salt and key from base64 strings
 */
export function importDerivedKey(exported: {
  salt: string;
  key: string;
}): {
  salt: Uint8Array;
  key: Uint8Array;
} {
  return {
    salt: Uint8Array.from(Buffer.from(exported.salt, 'base64')),
    key: Uint8Array.from(Buffer.from(exported.key, 'base64')),
  };
}
