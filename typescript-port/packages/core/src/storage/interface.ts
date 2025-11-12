/**
 * Storage interface
 *
 * Abstract interface for data persistence operations.
 */

/**
 * Query filter
 */
export interface QueryFilter<T> {
  /** Field to filter on */
  field: keyof T;
  /** Operator */
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
  /** Value to compare */
  value: unknown;
}

/**
 * Query options
 */
export interface QueryOptions<T> {
  /** Filters */
  where?: QueryFilter<T>[];
  /** Sort field */
  orderBy?: keyof T;
  /** Sort direction */
  order?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
  /** Skip results */
  offset?: number;
}

/**
 * Transaction callback
 */
export type TransactionCallback<T> = (tx: ITransaction) => Promise<T>;

/**
 * Storage transaction interface
 */
export interface ITransaction {
  /** Transaction is active */
  isActive: boolean;

  /** Commit transaction */
  commit(): Promise<void>;

  /** Rollback transaction */
  rollback(): Promise<void>;
}

/**
 * Generic storage interface
 */
export interface IStorage<T> {
  /**
   * Get entity by ID
   */
  get(id: string): Promise<T | undefined>;

  /**
   * Get multiple entities by IDs
   */
  getMany(ids: string[]): Promise<T[]>;

  /**
   * Get all entities
   */
  getAll(): Promise<T[]>;

  /**
   * Query entities with filters
   */
  query(options: QueryOptions<T>): Promise<T[]>;

  /**
   * Count entities matching query
   */
  count(options?: QueryOptions<T>): Promise<number>;

  /**
   * Create entity
   */
  create(data: Partial<T> & { id: string }): Promise<T>;

  /**
   * Update entity
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete entity
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple entities
   */
  deleteMany(ids: string[]): Promise<void>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Clear all entities
   */
  clear(): Promise<void>;
}
