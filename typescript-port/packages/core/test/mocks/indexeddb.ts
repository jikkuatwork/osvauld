/**
 * IndexedDB mock for testing
 *
 * Uses fake-indexeddb to provide a complete IndexedDB implementation
 * that works in Node.js test environment.
 */

import 'fake-indexeddb/auto';

/**
 * Reset IndexedDB state between tests
 */
export function resetIndexedDB(): void {
  // fake-indexeddb automatically provides indexedDB global
  // This function can be called in beforeEach to reset state
  if (typeof indexedDB !== 'undefined') {
    // Delete all databases
    const databases = indexedDB.databases
      ? indexedDB.databases()
      : Promise.resolve([]);
    void databases.then((dbs) => {
      dbs.forEach((db) => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    });
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
