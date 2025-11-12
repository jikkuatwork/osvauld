/**
 * Yjs Document Management
 *
 * Handles Y.Doc creation and text operations for collaborative editing.
 */

import * as Y from 'yjs';

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Update observer callback
 */
export type UpdateCallback = (update: Uint8Array, origin: unknown) => void;

/**
 * Creates a new Y.Doc for a document
 */
export function createYDoc(docId: string): Y.Doc {
  const ydoc = new Y.Doc();
  // Store doc ID as metadata
  ydoc.clientID; // Each doc has unique client ID
  return ydoc;
}

/**
 * Gets or creates a Y.Text instance for a field
 */
export function getYText(ydoc: Y.Doc, field = 'content'): Y.Text {
  return ydoc.getText(field);
}

/**
 * Gets or creates a Y.Map instance
 */
export function getYMap(ydoc: Y.Doc, name = 'data'): Y.Map<unknown> {
  return ydoc.getMap(name);
}

/**
 * Gets or creates a Y.Array instance
 */
export function getYArray(ydoc: Y.Doc, name = 'items'): Y.Array<unknown> {
  return ydoc.getArray(name);
}

/**
 * Subscribes to Y.Doc updates
 */
export function subscribeToUpdates(
  ydoc: Y.Doc,
  callback: UpdateCallback
): Unsubscribe {
  ydoc.on('update', callback);

  return () => {
    ydoc.off('update', callback);
  };
}

/**
 * Subscribes to Y.Text changes
 */
export function subscribeToTextChanges(
  ytext: Y.Text,
  callback: (event: Y.YTextEvent) => void
): Unsubscribe {
  ytext.observe(callback);

  return () => {
    ytext.unobserve(callback);
  };
}

/**
 * Inserts text at position
 */
export function insertText(ytext: Y.Text, index: number, text: string): void {
  ytext.insert(index, text);
}

/**
 * Deletes text range
 */
export function deleteText(ytext: Y.Text, index: number, length: number): void {
  ytext.delete(index, length);
}

/**
 * Gets current text content
 */
export function getText(ytext: Y.Text): string {
  return ytext.toString();
}

/**
 * Replaces entire text content
 */
export function setText(ytext: Y.Text, content: string): void {
  const currentLength = ytext.length;
  if (currentLength > 0) {
    ytext.delete(0, currentLength);
  }
  if (content.length > 0) {
    ytext.insert(0, content);
  }
}

/**
 * Applies transaction (batched operations)
 */
export function transact(ydoc: Y.Doc, fn: () => void, origin?: unknown): void {
  ydoc.transact(fn, origin);
}

/**
 * Destroys a Y.Doc (cleanup)
 */
export function destroyYDoc(ydoc: Y.Doc): void {
  ydoc.destroy();
}

/**
 * Gets Y.Doc size in bytes
 */
export function getDocSize(ydoc: Y.Doc): number {
  return Y.encodeStateAsUpdate(ydoc).byteLength;
}

/**
 * Clears all content in Y.Doc
 */
export function clearDoc(ydoc: Y.Doc): void {
  // Get all root types and clear them
  const keys = Array.from(ydoc.share.keys());
  ydoc.transact(() => {
    for (const key of keys) {
      const type = ydoc.share.get(key);
      if (type instanceof Y.Text) {
        type.delete(0, type.length);
      } else if (type instanceof Y.Array) {
        type.delete(0, type.length);
      } else if (type instanceof Y.Map) {
        type.clear();
      }
    }
  });
}
