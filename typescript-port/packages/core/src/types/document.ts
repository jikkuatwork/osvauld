/**
 * Document type definitions
 */

/**
 * Document
 */
export interface Document {
  /** Unique document ID */
  id: string;

  /** Document title */
  title: string;

  /** Encrypted content */
  encryptedContent: Uint8Array;

  /** Encryption IV */
  iv: Uint8Array;

  /** Owner user ID */
  ownerId: string;

  /** Parent folder ID (optional) */
  folderId?: string;

  /** Document tags */
  tags: string[];

  /** Is favorite */
  isFavorite: boolean;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /** Last accessed timestamp */
  lastAccessedAt?: Date;

  /** Document metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Document creation data
 */
export interface CreateDocumentData {
  title: string;
  encryptedContent: Uint8Array;
  iv: Uint8Array;
  ownerId: string;
  folderId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Document update data
 */
export interface UpdateDocumentData {
  title?: string;
  encryptedContent?: Uint8Array;
  iv?: Uint8Array;
  folderId?: string;
  tags?: string[];
  isFavorite?: boolean;
  lastAccessedAt?: Date;
  metadata?: Record<string, unknown>;
}
