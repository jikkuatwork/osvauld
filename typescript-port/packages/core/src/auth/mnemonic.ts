/**
 * Mnemonic-based authentication
 *
 * Provides account creation and login using BIP39 mnemonic phrases.
 */

import { toBase64, fromBase64, toHex, fromHex } from '../crypto/buffer-utils';
import {
  generateMnemonic,
  mnemonicToSeed,
  deriveKeyPair,
  recoverFromMnemonic,
  type DerivedKeyPair,
  MnemonicStrength,
} from '../crypto/mnemonic';
import {
  generateKeyPair as generateEd25519KeyPair,
  type KeyPair,
} from '../crypto/ed25519';
import {
  generateKey,
  encrypt,
  decrypt,
  importKey,
  type EncryptedData,
} from '../crypto/aes';
import { deriveKey, generateSalt } from '../crypto/argon2';
import type { User, CreateUserData } from '../types';

/**
 * Account information returned on creation
 */
export interface AccountInfo {
  /** User ID */
  userId: string;
  /** Username */
  username: string;
  /** Mnemonic phrase (MUST be saved by user!) */
  mnemonic: string;
  /** Ed25519 signing key pair */
  signingKey: KeyPair;
  /** Encrypted mnemonic (for storage) */
  encryptedMnemonic: EncryptedData;
  /** Salt used for password derivation */
  salt: Uint8Array;
}

/**
 * Login session information
 */
export interface LoginSession {
  /** User ID */
  userId: string;
  /** Username */
  username: string;
  /** Signing key pair */
  signingKey: KeyPair;
  /** Session token */
  sessionToken: string;
}

/**
 * Create a new account with mnemonic
 *
 * @param username Username for the account
 * @param password Password to encrypt mnemonic
 * @param strength Mnemonic strength (default: 12 words)
 * @returns Account information including mnemonic
 */
export async function createAccount(
  username: string,
  password: string,
  strength: MnemonicStrength = MnemonicStrength.Words12
): Promise<AccountInfo> {
  // Generate mnemonic
  const mnemonic = generateMnemonic(strength);

  // Generate Ed25519 signing key
  const signingKey = await generateEd25519KeyPair();

  // Generate user ID from public key
  const userId = toHex(signingKey.publicKey).slice(0, 16);

  // Encrypt mnemonic with password
  const salt = generateSalt();
  const passwordKey = deriveKey(password, salt, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
  const aesKey = await importKey(passwordKey);
  const encryptedMnemonic = await encrypt(mnemonic, aesKey);

  return {
    userId,
    username,
    mnemonic,
    signingKey,
    encryptedMnemonic,
    salt,
  };
}

/**
 * Store account information
 *
 * @param account Account info from createAccount
 * @param encryptedPrivateKey Encrypted private key for storage
 * @returns User data for storage
 */
export function createUserData(
  account: AccountInfo,
  encryptedPrivateKey: Uint8Array
): CreateUserData {
  return {
    username: account.username,
    publicKey: account.signingKey.publicKey,
    encryptedPrivateKey,
    metadata: {
      encryptedMnemonic: toBase64(account.encryptedMnemonic.ciphertext),
      mnemonicIV: toBase64(account.encryptedMnemonic.iv),
      passwordSalt: toBase64(account.salt),
    },
  };
}

/**
 * Login with username and password
 *
 * @param username Username
 * @param password Password
 * @param storedUser User data from storage
 * @returns Login session
 */
export async function login(
  username: string,
  password: string,
  storedUser: User
): Promise<LoginSession> {
  // Verify username matches
  if (storedUser.username !== username) {
    throw new Error('Invalid credentials');
  }

  // Extract metadata
  const metadata = storedUser.metadata as {
    encryptedMnemonic: string;
    mnemonicIV: string;
    passwordSalt: string;
  };

  // Derive key from password
  const salt = Uint8Array.from(fromBase64(metadata.passwordSalt));
  const passwordKey = deriveKey(password, salt, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });

  // Try to decrypt mnemonic
  try {
    const aesKey = await importKey(passwordKey);
    const encryptedMnemonic = {
      ciphertext: Uint8Array.from(
        fromBase64(metadata.encryptedMnemonic)
      ),
      iv: Uint8Array.from(fromBase64(metadata.mnemonicIV)),
    };

    await decrypt(encryptedMnemonic, aesKey);

    // If decryption succeeds, create session
    const sessionToken = toHex(crypto.getRandomValues(new Uint8Array(32)));

    // For now, we'll use the stored public key and a placeholder for private key
    // In a real implementation, you'd decrypt the stored private key
    return {
      userId: storedUser.id,
      username: storedUser.username,
      signingKey: {
        publicKey: storedUser.publicKey,
        privateKey: storedUser.encryptedPrivateKey || new Uint8Array(32), // Placeholder
      },
      sessionToken,
    };
  } catch {
    throw new Error('Invalid credentials');
  }
}

/**
 * Recover account from mnemonic
 *
 * @param mnemonic BIP39 mnemonic phrase
 * @param path Optional derivation path
 * @returns Derived key pair
 */
export async function recoverAccount(
  mnemonic: string,
  path?: string
): Promise<DerivedKeyPair> {
  return await recoverFromMnemonic(mnemonic, path);
}

/**
 * Change account password
 *
 * @param oldPassword Current password
 * @param newPassword New password
 * @param storedUser User data from storage
 * @returns Updated encrypted mnemonic and salt
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
  storedUser: User
): Promise<{
  encryptedMnemonic: EncryptedData;
  salt: Uint8Array;
}> {
  // First, verify old password by trying to decrypt
  const metadata = storedUser.metadata as {
    encryptedMnemonic: string;
    mnemonicIV: string;
    passwordSalt: string;
  };

  const oldSalt = Uint8Array.from(
    fromBase64(metadata.passwordSalt)
  );
  const oldPasswordKey = deriveKey(oldPassword, oldSalt, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
  const oldAesKey = await importKey(oldPasswordKey);

  const encryptedMnemonic = {
    ciphertext: Uint8Array.from(
      fromBase64(metadata.encryptedMnemonic)
    ),
    iv: Uint8Array.from(fromBase64(metadata.mnemonicIV)),
  };

  // Decrypt with old password
  const mnemonicBytes = await decrypt(encryptedMnemonic, oldAesKey);
  const mnemonic = new TextDecoder().decode(mnemonicBytes);

  // Re-encrypt with new password
  const newSalt = generateSalt();
  const newPasswordKey = deriveKey(newPassword, newSalt, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
  const newAesKey = await importKey(newPasswordKey);
  const newEncryptedMnemonic = await encrypt(mnemonic, newAesKey);

  return {
    encryptedMnemonic: newEncryptedMnemonic,
    salt: newSalt,
  };
}
