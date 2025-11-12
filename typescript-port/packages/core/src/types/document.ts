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

  /** Encrypted content (base64) */
  encryptedContent: string;

  /** Content encryption IV (base64) */
  contentIV: string;

  /** Encrypted document key (base64) */
  encryptedKey: string;

  /** Key encryption IV (base64) */
  keyIV: string;

  /** Document signature (base64) */
  signature: string;

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
  encryptedContent: string;
  contentIV: string;
  encryptedKey: string;
  keyIV: string;
  signature: string;
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
  encryptedContent?: string;
  contentIV?: string;
  encryptedKey?: string;
  keyIV?: string;
  signature?: string;
  folderId?: string;
  tags?: string[];
  isFavorite?: boolean;
  lastAccessedAt?: Date;
  metadata?: Record<string, unknown>;
}
