/**
 * User repository
 */

import type { User } from '../../types';
import type { OsvauldDB } from '../indexeddb';
import { BaseRepository } from './base';

export class UserRepository extends BaseRepository<User> {
  constructor(db: OsvauldDB) {
    super(db.users);
  }

  async getByUsername(username: string): Promise<User | undefined> {
    return await this.table.where('username').equals(username).first();
  }

  async getByEmail(email: string): Promise<User | undefined> {
    return await this.table.where('email').equals(email).first();
  }
}
