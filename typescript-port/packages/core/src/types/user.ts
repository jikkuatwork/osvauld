/**
 * User type definitions
 */

/**
 * User account
 */
export interface User {
  /** Unique user ID */
  id: string;

  /** Username */
  username: string;

  /** Email address (optional) */
  email?: string;

  /** Public key (Ed25519) */
  publicKey: Uint8Array;

  /** Encrypted private key */
  encryptedPrivateKey?: Uint8Array;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /** Last login timestamp */
  lastLoginAt?: Date;

  /** User metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User creation data
 */
export interface CreateUserData {
  username: string;
  email?: string;
  publicKey: Uint8Array;
  encryptedPrivateKey?: Uint8Array;
  metadata?: Record<string, unknown>;
}

/**
 * User update data
 */
export interface UpdateUserData {
  email?: string;
  publicKey?: Uint8Array;
  encryptedPrivateKey?: Uint8Array;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
}
