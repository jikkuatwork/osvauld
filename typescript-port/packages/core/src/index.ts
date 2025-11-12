/**
 * Osvauld Core Library
 *
 * A secure, decentralized password manager with:
 * - Client-side encryption
 * - P2P synchronization
 * - CRDT-based collaborative editing
 * - UCAN-based sharing
 */

export const version = '0.1.0';

// Main API
export * from './osvauld';

// Types
export type { User } from './types/user';
export type { Document } from './types/document';
export type { Folder } from './types/folder';
export type { FolderNode } from './documents/folders';
export type { ShareRecord } from './types/share';
export type { ShareLink } from './types/share-link';

// Crypto
export * from './crypto/aes';
export * from './crypto/argon2';
export * from './crypto/ed25519';

// Authentication
export * from './auth/manager';
export * from './auth/metamask';
export * from './auth/session';

// Documents
export * from './documents/manager';
export * from './documents/folders';
export * from './documents/encryption';

// CRDT
export * from './crdt/ydoc';
export * from './crdt/sync';
export * from './crdt/persistence';

// P2P
export * from './p2p/interface';
export * from './p2p/sync';
// export * from './p2p/mock-peer'; // Node.js only - uses EventEmitter

// Search
export * from './search/indexer';

// Sharing & UCAN
export * from './ucan/types';
export * from './ucan/token';
export * from './sharing/manager';

// Storage
export * from './storage/indexeddb';
export * from './storage/interface';
export * from './storage/errors';
