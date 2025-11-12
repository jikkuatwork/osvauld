/**
 * Document Encryption Module
 *
 * Handles encryption/decryption of document content and key sharing between users.
 * Uses hybrid encryption: AES-GCM for content, Ed25519 for key exchange.
 */

import { encrypt, decrypt, generateKey, exportKey, importKey } from '../crypto/aes';
import { sign, verify } from '../crypto/ed25519';
import type { EncryptedData } from '../crypto/aes';
import type { KeyPair } from '../crypto/ed25519';

// Simplified sandbox key store (in reality, keys would be derived from user keypairs)
const sandboxKeyStore = new Map<string, CryptoKey>();

/**
 * Sandbox document key store (stores unencrypted document keys for testing)
 * In production, document keys would be properly encrypted with user's KEK
 */
const sandboxDocumentKeyStore = new Map<string, CryptoKey>();

/**
 * Encrypted document structure
 */
export interface EncryptedDocument {
  /** Encrypted content */
  content: EncryptedData;
  /** Document encryption key (encrypted for owner) */
  encryptedKey: EncryptedData;
  /** Signature of encrypted content */
  signature: Uint8Array;
  /** Metadata (unencrypted) */
  metadata: {
    docId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Encrypted key for sharing
 */
export interface EncryptedKeyForUser {
  /** User ID this key is for */
  userId: string;
  /** Document ID */
  docId: string;
  /** Encrypted document key */
  encryptedKey: EncryptedData;
  /** Signature from the sharer */
  signature: Uint8Array;
}

/**
 * Encrypts document content with a new AES key
 */
export async function encryptDocument(
  content: string,
  ownerId: string,
  docId: string,
  ownerKeyPair: KeyPair
): Promise<{ encrypted: EncryptedDocument; documentKey: CryptoKey }> {
  // Generate document encryption key
  const documentKey = await generateKey();

  // Encrypt the content
  const encryptedContent = await encrypt(content, documentKey);

  // Export the document key for storage
  const exportedKey = await exportKey(documentKey);

  // Encrypt the document key with owner's public key (using AES for simplicity)
  // In a real system, you'd use public key encryption (ECIES or similar)
  const keyEncryptionKey = await generateKey();
  const encryptedKey = await encrypt(exportedKey, keyEncryptionKey);

  // Store the key encryption key derivation info (in real system, derive from owner's keypair)
  // For now, we'll store it separately (simplified for sandbox)

  // Sign the encrypted content
  const signature = await sign(encryptedContent.ciphertext, ownerKeyPair.privateKey);

  const encrypted: EncryptedDocument = {
    content: encryptedContent,
    encryptedKey,
    signature,
    metadata: {
      docId,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Store document key in sandbox (for testing)
  sandboxDocumentKeyStore.set(docId, documentKey);

  return { encrypted, documentKey };
}

/**
 * Gets a document key from sandbox store (for testing only)
 */
export function getSandboxDocumentKey(docId: string): CryptoKey | undefined {
  return sandboxDocumentKeyStore.get(docId);
}

/**
 * Decrypts document content
 */
export async function decryptDocument(
  encrypted: EncryptedDocument,
  documentKey: CryptoKey,
  ownerPublicKey: Uint8Array
): Promise<string> {
  // Verify signature
  const isValid = await verify(
    encrypted.signature,
    encrypted.content.ciphertext,
    ownerPublicKey
  );

  if (!isValid) {
    throw new Error('Invalid document signature');
  }

  // Decrypt content
  const contentBytes = await decrypt(encrypted.content, documentKey);

  // Convert Uint8Array back to string
  return new TextDecoder().decode(contentBytes);
}

/**
 * Encrypts document key for another user (for sharing)
 */
export async function encryptKeyForUser(
  documentKey: CryptoKey,
  recipientId: string,
  docId: string,
  sharerKeyPair: KeyPair
): Promise<EncryptedKeyForUser> {
  // Export the document key
  const exportedKey = await exportKey(documentKey);

  // Encrypt for recipient (simplified - in reality, use recipient's public key)
  const recipientKeyEncryptionKey = await generateKey();
  const encryptedKey = await encrypt(exportedKey, recipientKeyEncryptionKey);

  // Store key for sandbox (in reality, derive from recipient's public key)
  const storeKey = `${recipientId}:${docId}`;
  sandboxKeyStore.set(storeKey, recipientKeyEncryptionKey);

  // Sign the encrypted key
  const signature = await sign(encryptedKey.ciphertext, sharerKeyPair.privateKey);

  return {
    userId: recipientId,
    docId,
    encryptedKey,
    signature,
  };
}

/**
 * Decrypts a shared document key
 */
export async function decryptKeyForUser(
  encryptedKeyData: EncryptedKeyForUser,
  userKeyPair: KeyPair,
  sharerPublicKey: Uint8Array
): Promise<CryptoKey> {
  // Verify signature
  const isValid = await verify(
    encryptedKeyData.signature,
    encryptedKeyData.encryptedKey.ciphertext,
    sharerPublicKey
  );

  if (!isValid) {
    throw new Error('Invalid key share signature');
  }

  // Retrieve key from sandbox store (in reality, derive from user's private key)
  const storeKey = `${encryptedKeyData.userId}:${encryptedKeyData.docId}`;
  const keyEncryptionKey = sandboxKeyStore.get(storeKey);

  if (!keyEncryptionKey) {
    throw new Error('Key not found in sandbox store (would be derived from private key in production)');
  }

  const exportedKeyBytes = await decrypt(encryptedKeyData.encryptedKey, keyEncryptionKey);

  // Import back to CryptoKey
  const documentKey = await importKey(exportedKeyBytes);

  return documentKey;
}

/**
 * Re-encrypts document content (for updates)
 */
export async function reEncryptDocument(
  content: string,
  encrypted: EncryptedDocument,
  documentKey: CryptoKey,
  ownerKeyPair: KeyPair
): Promise<EncryptedDocument> {
  // Encrypt new content
  const encryptedContent = await encrypt(content, documentKey);

  // Sign new content
  const signature = await sign(encryptedContent.ciphertext, ownerKeyPair.privateKey);

  return {
    ...encrypted,
    content: encryptedContent,
    signature,
    metadata: {
      ...encrypted.metadata,
      updatedAt: new Date(),
    },
  };
}

/**
 * Verifies document integrity
 */
export async function verifyDocumentIntegrity(
  encrypted: EncryptedDocument,
  ownerPublicKey: Uint8Array
): Promise<boolean> {
  return await verify(
    encrypted.signature,
    encrypted.content.ciphertext,
    ownerPublicKey
  );
}
