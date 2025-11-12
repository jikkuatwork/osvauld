/**
 * Storage error types
 */

/**
 * Base storage error
 */
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends StorageError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Duplicate error
 */
export class DuplicateError extends StorageError {
  constructor(entity: string, key: string) {
    super(`${entity} already exists: ${key}`);
    this.name = 'DuplicateError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends StorageError {
  constructor(message: string) {
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
  }
}

/**
 * Transaction error
 */
export class TransactionError extends StorageError {
  constructor(message: string) {
    super(`Transaction failed: ${message}`);
    this.name = 'TransactionError';
  }
}
