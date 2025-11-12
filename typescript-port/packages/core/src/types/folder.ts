/**
 * Folder type definitions
 */

/**
 * Folder for organizing documents
 */
export interface Folder {
  /** Unique folder ID */
  id: string;

  /** Folder name */
  name: string;

  /** Parent folder ID (null for root) */
  parentId: string | null;

  /** Owner user ID */
  ownerId: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /** Folder metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Folder creation data
 */
export interface CreateFolderData {
  name: string;
  parentId?: string | null;
  ownerId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Folder update data
 */
export interface UpdateFolderData {
  name?: string;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
}
