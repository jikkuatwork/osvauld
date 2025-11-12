/**
 * Document repository
 */

import type { Document } from '../../types';
import type { Table } from 'dexie';
import { BaseRepository } from './base';

export class DocumentRepository extends BaseRepository<Document> {
  constructor(table: Table<Document, string>) {
    super(table);
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
