/**
 * Base repository with common CRUD operations
 */

import type { Table } from 'dexie';
import { NotFoundError } from '../errors';

export class BaseRepository<T extends { id: string }> {
  constructor(protected table: Table<T, string>) {}

  async get(id: string): Promise<T> {
    const entity = await this.table.get(id);
    if (!entity) {
      throw new NotFoundError(this.table.name, id);
    }
    return entity;
  }

  async getMany(ids: string[]): Promise<T[]> {
    return await this.table.bulkGet(ids).then((results) =>
      results.filter((r): r is T => r !== undefined)
    );
  }

  async getAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  async list(): Promise<T[]> {
    return await this.getAll();
  }

  async create(data: T): Promise<T> {
    await this.table.add(data);
    return data;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.table.update(id, data);
    return await this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.table.where('id').equals(id).count();
    return count > 0;
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}
