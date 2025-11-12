/**
 * Storage test helpers
 */

/**
 * Mock storage implementation for testing
 */
export class MockStorage {
  private data: Map<string, unknown> = new Map();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  clear(): void {
    this.data.clear();
  }

  keys(): string[] {
    return Array.from(this.data.keys());
  }

  values<T>(): T[] {
    return Array.from(this.data.values()) as T[];
  }

  size(): number {
    return this.data.size;
  }
}

/**
 * Create a fresh mock storage instance for each test
 */
export function mockStorage(): MockStorage {
  return new MockStorage();
}
