/**
 * Folder Repository
 */

import { BaseRepository } from './base';
import type { Folder } from '../../types/folder';
import type { Table } from 'dexie';

export class FolderRepository extends BaseRepository<Folder> {
  constructor(table: Table<Folder, string>) {
    super(table);
  }

  /**
   * Gets folders by owner
   */
  async getByOwner(ownerId: string): Promise<Folder[]> {
    return await this.table.where('ownerId').equals(ownerId).toArray();
  }

  /**
   * Gets child folders
   */
  async getChildrenOfFolder(parentId: string): Promise<Folder[]> {
    return await this.table.where('parentId').equals(parentId).toArray();
  }

  /**
   * Gets root folders (no parent)
   */
  async getRootFolders(ownerId: string): Promise<Folder[]> {
    const allFolders = await this.getByOwner(ownerId);
    return allFolders.filter((f) => !f.parentId);
  }
}
