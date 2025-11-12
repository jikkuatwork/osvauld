/**
 * CRDT Persistence
 *
 * Handles saving and loading Y.Doc state to/from storage.
 */

import * as Y from 'yjs';
import { encrypt, decrypt } from '../crypto/aes';
import type { EncryptedData } from '../crypto/aes';
import { toBase64, fromBase64 } from '../crypto/buffer-utils';

/**
 * Saved document state
 */
export interface SavedDocumentState {
  docId: string;
  state: Uint8Array;
  timestamp: Date;
  version: number;
}

/**
 * Encrypted saved state
 */
export interface EncryptedSavedState {
  docId: string;
  encryptedState: EncryptedData;
  timestamp: Date;
  version: number;
}

/**
 * Saves Y.Doc state as Uint8Array
 */
export function saveDocumentState(ydoc: Y.Doc, docId: string): SavedDocumentState {
  const state = Y.encodeStateAsUpdate(ydoc);

  return {
    docId,
    state,
    timestamp: new Date(),
    version: 1,
  };
}

/**
 * Loads Y.Doc state from saved data
 */
export function loadDocumentState(savedState: SavedDocumentState): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, savedState.state);
  return ydoc;
}

/**
 * Encrypts Y.Doc updates
 */
export async function encryptYDocUpdates(
  updates: Uint8Array,
  key: CryptoKey
): Promise<EncryptedData> {
  return await encrypt(updates, key);
}

/**
 * Decrypts Y.Doc updates
 */
export async function decryptYDocUpdates(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const decryptedBytes = await decrypt(encrypted, key);
  return decryptedBytes;
}

/**
 * Saves encrypted Y.Doc state
 */
export async function saveEncryptedState(
  ydoc: Y.Doc,
  docId: string,
  key: CryptoKey
): Promise<EncryptedSavedState> {
  const state = Y.encodeStateAsUpdate(ydoc);
  const encryptedState = await encryptYDocUpdates(state, key);

  return {
    docId,
    encryptedState,
    timestamp: new Date(),
    version: 1,
  };
}

/**
 * Loads encrypted Y.Doc state
 */
export async function loadEncryptedState(
  encryptedSaved: EncryptedSavedState,
  key: CryptoKey
): Promise<Y.Doc> {
  const state = await decryptYDocUpdates(encryptedSaved.encryptedState, key);

  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);

  return ydoc;
}

/**
 * Serializes saved state to JSON-compatible format
 */
export function serializeSavedState(savedState: SavedDocumentState): string {
  return JSON.stringify({
    docId: savedState.docId,
    state: toBase64(savedState.state),
    timestamp: savedState.timestamp.toISOString(),
    version: savedState.version,
  });
}

/**
 * Deserializes saved state from JSON
 */
export function deserializeSavedState(serialized: string): SavedDocumentState {
  const parsed = JSON.parse(serialized);

  return {
    docId: parsed.docId,
    state: fromBase64(parsed.state),
    timestamp: new Date(parsed.timestamp),
    version: parsed.version,
  };
}

/**
 * Serializes encrypted saved state
 */
export function serializeEncryptedState(encryptedSaved: EncryptedSavedState): string {
  return JSON.stringify({
    docId: encryptedSaved.docId,
    encryptedState: {
      ciphertext: toBase64(encryptedSaved.encryptedState.ciphertext),
      iv: toBase64(encryptedSaved.encryptedState.iv),
    },
    timestamp: encryptedSaved.timestamp.toISOString(),
    version: encryptedSaved.version,
  });
}

/**
 * Deserializes encrypted saved state
 */
export function deserializeEncryptedState(serialized: string): EncryptedSavedState {
  const parsed = JSON.parse(serialized);

  return {
    docId: parsed.docId,
    encryptedState: {
      ciphertext: fromBase64(parsed.encryptedState.ciphertext),
      iv: fromBase64(parsed.encryptedState.iv),
    },
    timestamp: new Date(parsed.timestamp),
    version: parsed.version,
  };
}

/**
 * Gets incremental updates since a state vector
 */
export function getIncrementalUpdates(
  ydoc: Y.Doc,
  sinceStateVector: Uint8Array
): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc, sinceStateVector);
}

/**
 * Applies incremental update to saved state
 */
export function applyIncrementalUpdate(
  savedState: SavedDocumentState,
  update: Uint8Array
): SavedDocumentState {
  const ydoc = loadDocumentState(savedState);
  Y.applyUpdate(ydoc, update);

  return saveDocumentState(ydoc, savedState.docId);
}

/**
 * Compacts document state (removes deleted content)
 */
export function compactDocumentState(savedState: SavedDocumentState): SavedDocumentState {
  const ydoc = loadDocumentState(savedState);
  const compactedState = Y.encodeStateAsUpdate(ydoc);

  return {
    ...savedState,
    state: compactedState,
    timestamp: new Date(),
  };
}

/**
 * Gets document state size
 */
export function getStateSize(savedState: SavedDocumentState): number {
  return savedState.state.byteLength;
}

/**
 * Validates saved state
 */
export function validateSavedState(savedState: SavedDocumentState): boolean {
  try {
    const ydoc = loadDocumentState(savedState);
    ydoc.destroy();
    return true;
  } catch (error) {
    return false;
  }
}
