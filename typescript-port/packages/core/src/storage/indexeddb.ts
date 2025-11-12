/**
 * IndexedDB storage implementation using Dexie
 */

import Dexie, { type Table } from 'dexie';
import type {
  User,
  Document,
  Folder,
  ShareRecord,
  Device,
} from '../types';

/**
 * Osvauld database schema
 */
export class OsvauldDB extends Dexie {
  users!: Table<User, string>;
  documents!: Table<Document, string>;
  folders!: Table<Folder, string>;
  shares!: Table<ShareRecord, string>;
  devices!: Table<Device, string>;

  constructor(name = 'osvauld') {
    super(name);

    this.version(1).stores({
      users: 'id, username, email, createdAt',
      documents:
        'id, title, ownerId, folderId, createdAt, updatedAt, *tags',
      folders: 'id, name, ownerId, parentId, createdAt',
      shares: 'id, documentId, ownerId, recipientId, createdAt',
      devices: 'id, userId, name, createdAt',
    });
  }
}

/**
 * Initialize database
 */
export function initDatabase(name?: string): OsvauldDB {
  return new OsvauldDB(name);
}

/**
 * Close database
 */
export async function closeDatabase(db: OsvauldDB): Promise<void> {
  await db.close();
}

/**
 * Delete database
 */
export async function deleteDatabase(name: string): Promise<void> {
  await Dexie.delete(name);
}
