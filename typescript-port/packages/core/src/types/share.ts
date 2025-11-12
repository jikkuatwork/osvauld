/**
 * Share type definitions
 */

/**
 * Permission level
 */
export enum Permission {
  /** Read-only access */
  Read = 'read',
  /** Read and write access */
  Write = 'write',
  /** Full access including sharing */
  Admin = 'admin',
}

/**
 * Share record
 */
export interface ShareRecord {
  /** Unique share ID */
  id: string;

  /** Document ID being shared */
  documentId: string;

  /** Owner user ID (who is sharing) */
  ownerId: string;

  /** Recipient user ID (who receives access) */
  recipientId: string;

  /** Permission level */
  permission: Permission;

  /** Encrypted document key for recipient */
  encryptedKey: Uint8Array;

  /** Creation timestamp */
  createdAt: Date;

  /** Expiration timestamp (optional) */
  expiresAt?: Date;

  /** Share metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Share creation data
 */
export interface CreateShareData {
  documentId: string;
  ownerId: string;
  recipientId: string;
  permission: Permission;
  encryptedKey: Uint8Array;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Share update data
 */
export interface UpdateShareData {
  permission?: Permission;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}
