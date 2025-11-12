/**
 * Share Link Repository
 */

import type { Table } from 'dexie';
import { BaseRepository } from './base';
import type { ShareLink } from '../../types/share-link';

/**
 * Repository for share links
 */
export class ShareLinkRepository extends BaseRepository<ShareLink> {
  constructor(table: Table<ShareLink, string>) {
    super(table);
  }

  /**
   * Finds share links by document ID
   */
  async findByDocumentId(documentId: string): Promise<ShareLink[]> {
    const all = await this.list();
    return all.filter((link) => link.documentId === documentId);
  }

  /**
   * Finds share links by creator
   */
  async findByCreator(createdBy: string): Promise<ShareLink[]> {
    const all = await this.list();
    return all.filter((link) => link.createdBy === createdBy);
  }

  /**
   * Finds expired share links
   */
  async findExpired(): Promise<ShareLink[]> {
    const all = await this.list();
    const now = new Date();
    return all.filter((link) => link.expiresAt < now);
  }
}
