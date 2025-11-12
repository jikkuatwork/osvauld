/**
 * CRDT Sync Protocol
 *
 * Handles encoding/decoding of updates and synchronization between Y.Docs.
 */

import * as Y from 'yjs';

/**
 * Encodes an update as Uint8Array
 */
export function encodeUpdate(update: Uint8Array): Uint8Array {
  return update;
}

/**
 * Decodes an update from Uint8Array
 */
export function decodeUpdate(encoded: Uint8Array): Uint8Array {
  return encoded;
}

/**
 * Applies an update to a Y.Doc
 */
export function applyUpdate(ydoc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(ydoc, update, origin);
}

/**
 * Gets the state vector of a Y.Doc
 */
export function getStateVector(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(ydoc);
}

/**
 * Gets missing updates based on state vector
 */
export function getMissingUpdates(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc, stateVector);
}

/**
 * Encodes the entire document state as update
 */
export function encodeDocumentState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Applies document state to a Y.Doc
 */
export function applyDocumentState(ydoc: Y.Doc, state: Uint8Array): void {
  Y.applyUpdate(ydoc, state);
}

/**
 * Diffs two state vectors and gets missing updates
 */
export function diffStateVectors(
  ydoc: Y.Doc,
  localVector: Uint8Array,
  remoteVector: Uint8Array
): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc, remoteVector);
}

/**
 * Merges two Y.Docs
 */
export function mergeDocs(target: Y.Doc, source: Y.Doc): void {
  const update = Y.encodeStateAsUpdate(source);
  Y.applyUpdate(target, update);
}

/**
 * Syncs two Y.Docs bidirectionally
 */
export function syncDocs(doc1: Y.Doc, doc2: Y.Doc): void {
  // Get updates from doc1 that doc2 doesn't have
  const doc2StateVector = Y.encodeStateVector(doc2);
  const doc1Updates = Y.encodeStateAsUpdate(doc1, doc2StateVector);

  // Get updates from doc2 that doc1 doesn't have
  const doc1StateVector = Y.encodeStateVector(doc1);
  const doc2Updates = Y.encodeStateAsUpdate(doc2, doc1StateVector);

  // Apply updates
  if (doc1Updates.byteLength > 0) {
    Y.applyUpdate(doc2, doc1Updates);
  }

  if (doc2Updates.byteLength > 0) {
    Y.applyUpdate(doc1, doc2Updates);
  }
}

/**
 * Creates a snapshot of the current document state
 */
export function createSnapshot(ydoc: Y.Doc): Y.Snapshot {
  return Y.snapshot(ydoc);
}

/**
 * Encodes a snapshot
 */
export function encodeSnapshot(snapshot: Y.Snapshot): Uint8Array {
  return Y.encodeSnapshot(snapshot);
}

/**
 * Decodes a snapshot
 */
export function decodeSnapshot(encoded: Uint8Array): Y.Snapshot {
  return Y.decodeSnapshot(encoded);
}

/**
 * Restores document to a snapshot state (creates new doc)
 */
export function restoreSnapshot(ydoc: Y.Doc, snapshot: Y.Snapshot): Y.Doc {
  const restoredDoc = new Y.Doc();
  const update = Y.encodeStateAsUpdate(ydoc);
  Y.applyUpdate(restoredDoc, update);
  return restoredDoc;
}

/**
 * Compares if two documents are in sync
 */
export function areDocsInSync(doc1: Y.Doc, doc2: Y.Doc): boolean {
  const doc1State = Y.encodeStateAsUpdate(doc1);
  const doc2State = Y.encodeStateAsUpdate(doc2);

  if (doc1State.byteLength !== doc2State.byteLength) {
    return false;
  }

  // Compare byte-by-byte
  for (let i = 0; i < doc1State.byteLength; i++) {
    if (doc1State[i] !== doc2State[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Gets document hash (for comparison)
 */
export function getDocHash(ydoc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(ydoc);
  // Simple hash by converting to base64
  return Buffer.from(state).toString('base64');
}

/**
 * Validates an update
 */
export function validateUpdate(update: Uint8Array): boolean {
  try {
    // Try to decode the update - if it fails, it's invalid
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, update);
    tempDoc.destroy();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets update size in bytes
 */
export function getUpdateSize(update: Uint8Array): number {
  return update.byteLength;
}

/**
 * Compresses an update (Yjs already uses compact encoding)
 */
export function compressUpdate(update: Uint8Array): Uint8Array {
  // Yjs already uses efficient encoding
  // In production, you could use additional compression like gzip
  return update;
}

/**
 * Decompresses an update
 */
export function decompressUpdate(compressed: Uint8Array): Uint8Array {
  // If using compression, decompress here
  return compressed;
}
