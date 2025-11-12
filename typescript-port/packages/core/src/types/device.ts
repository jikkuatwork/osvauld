/**
 * Device type definitions
 */

/**
 * Device information
 */
export interface Device {
  /** Unique device ID */
  id: string;

  /** User ID that owns this device */
  userId: string;

  /** Device name */
  name: string;

  /** Device public key */
  publicKey: Uint8Array;

  /** Device type (desktop, mobile, etc) */
  type: string;

  /** Last sync timestamp */
  lastSyncAt?: Date;

  /** Creation timestamp */
  createdAt: Date;

  /** Device metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Device creation data
 */
export interface CreateDeviceData {
  userId: string;
  name: string;
  publicKey: Uint8Array;
  type: string;
  metadata?: Record<string, unknown>;
}

/**
 * Device update data
 */
export interface UpdateDeviceData {
  name?: string;
  lastSyncAt?: Date;
  metadata?: Record<string, unknown>;
}
