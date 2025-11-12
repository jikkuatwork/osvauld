/**
 * BIP39 Mnemonic operations
 *
 * Provides mnemonic phrase generation and key derivation
 * using BIP39 and BIP32 standards.
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';

/**
 * Mnemonic strength (in bits)
 */
export enum MnemonicStrength {
  /** 12 words */
  Words12 = 128,
  /** 15 words */
  Words15 = 160,
  /** 18 words */
  Words18 = 192,
  /** 21 words */
  Words21 = 224,
  /** 24 words */
  Words24 = 256,
}

/**
 * Key pair derived from mnemonic
 */
export interface DerivedKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  chainCode: Uint8Array;
  path: string;
}

/**
 * Generate a new mnemonic phrase
 *
 * @param strength Mnemonic strength (default: 128 = 12 words)
 * @returns BIP39 mnemonic phrase
 */
export function generateMnemonic(
  strength: MnemonicStrength = MnemonicStrength.Words12
): string {
  return bip39.generateMnemonic(wordlist, strength);
}

/**
 * Validate a mnemonic phrase
 *
 * @param mnemonic Mnemonic phrase to validate
 * @returns true if valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic, wordlist);
}

/**
 * Convert mnemonic to seed bytes
 *
 * @param mnemonic Mnemonic phrase
 * @param passphrase Optional passphrase
 * @returns Seed bytes (64 bytes)
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase = ''
): Promise<Uint8Array> {
  return await bip39.mnemonicToSeed(mnemonic, passphrase);
}

/**
 * Derive a key pair from seed using BIP32 derivation path
 *
 * @param seed Seed bytes from mnemonic
 * @param path BIP32 derivation path (e.g., "m/44'/0'/0'/0/0")
 * @returns Derived key pair
 */
export function deriveKeyPair(
  seed: Uint8Array,
  path: string
): DerivedKeyPair {
  const hdkey = HDKey.fromMasterSeed(seed);
  const derived = hdkey.derive(path);

  if (!derived.privateKey) {
    throw new Error('Failed to derive private key');
  }

  return {
    publicKey: derived.publicKey!,
    privateKey: derived.privateKey,
    chainCode: derived.chainCode!,
    path,
  };
}

/**
 * Derive multiple key pairs from a mnemonic
 *
 * @param mnemonic Mnemonic phrase
 * @param paths Array of derivation paths
 * @returns Array of derived key pairs
 */
export async function deriveMultipleKeys(
  mnemonic: string,
  paths: string[]
): Promise<DerivedKeyPair[]> {
  const seed = await mnemonicToSeed(mnemonic);
  return paths.map((path) => deriveKeyPair(seed, path));
}

/**
 * Get default derivation path for account/index
 *
 * Uses BIP44 standard: m/44'/0'/account'/0/index
 */
export function getDerivationPath(account = 0, index = 0): string {
  return `m/44'/0'/${account}'/0/${index}`;
}

/**
 * Generate mnemonic and derive first key pair
 *
 * @param strength Mnemonic strength
 * @returns Mnemonic and derived key pair
 */
export async function generateMnemonicWithKey(
  strength: MnemonicStrength = MnemonicStrength.Words12
): Promise<{
  mnemonic: string;
  keyPair: DerivedKeyPair;
}> {
  const mnemonic = generateMnemonic(strength);
  const seed = await mnemonicToSeed(mnemonic);
  const keyPair = deriveKeyPair(seed, getDerivationPath());

  return { mnemonic, keyPair };
}

/**
 * Recover key pair from mnemonic
 *
 * @param mnemonic Mnemonic phrase
 * @param path Derivation path (default: m/44'/0'/0'/0/0)
 * @returns Derived key pair
 */
export async function recoverFromMnemonic(
  mnemonic: string,
  path: string = getDerivationPath()
): Promise<DerivedKeyPair> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const seed = await mnemonicToSeed(mnemonic);
  return deriveKeyPair(seed, path);
}
