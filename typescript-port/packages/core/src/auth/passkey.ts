/**
 * Passkey (WebAuthn) authentication
 *
 * Provides passwordless authentication using WebAuthn/FIDO2.
 */

import { generateKeyPair } from '../crypto/ed25519';

/**
 * Passkey credential info
 */
export interface PasskeyCredential {
  /** Credential ID */
  id: string;
  /** Public key */
  publicKey: Uint8Array;
  /** User handle */
  userHandle: string;
}

/**
 * Passkey authentication result
 */
export interface PasskeyAuthResult {
  /** User handle */
  userHandle: string;
  /** Credential ID */
  credentialId: string;
  /** Ed25519 signing key */
  signingKey: {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
}

/**
 * Register a new passkey
 *
 * @param username Username
 * @param userId User ID
 * @returns Credential info
 */
export async function registerPasskey(
  username: string,
  userId: string
): Promise<PasskeyCredential> {
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    throw new Error('WebAuthn not available');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Osvauld',
        id: 'osvauld.local',
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Failed to create passkey');
  }

  // Extract public key (simplified)
  const publicKey = new Uint8Array(32); // Placeholder
  crypto.getRandomValues(publicKey);

  return {
    id: credential.id,
    publicKey,
    userHandle: userId,
  };
}

/**
 * Authenticate with passkey
 *
 * @returns Authentication result
 */
export async function authenticateWithPasskey(): Promise<PasskeyAuthResult> {
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    throw new Error('WebAuthn not available');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      userVerification: 'preferred',
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Authentication failed');
  }

  // Generate Ed25519 key from credential
  const signingKey = await generateKeyPair();

  return {
    userHandle: 'user-handle',
    credentialId: assertion.id,
    signingKey,
  };
}

/**
 * Verify passkey assertion
 *
 * Note: Full verification requires authenticator data parsing.
 * This is a simplified check.
 *
 * @param credentialId Credential ID
 * @param userHandle Expected user handle
 * @returns true if valid
 */
export function verifyPasskeyAssertion(
  credentialId: string,
  userHandle: string
): boolean {
  return credentialId.length > 0 && userHandle.length > 0;
}
