/**
 * Document repository
 */

import type { Document } from '../../types';
import type { OsvauldDB } from '../indexeddb';
import { BaseRepository } from './base';

export class DocumentRepository extends BaseRepository<Document> {
  constructor(db: OsvauldDB) {
    super(db.documents);
  }

  async getByOwner(ownerId: string): Promise<Document[]> {
    return await this.table.where('ownerId').equals(ownerId).toArray();
  }

  async getByFolder(folderId: string): Promise<Document[]> {
    return await this.table.where('folderId').equals(folderId).toArray();
  }

  async getByTag(tag: string): Promise<Document[]> {
    return await this.table.where('tags').equals(tag).toArray();
  }
}
