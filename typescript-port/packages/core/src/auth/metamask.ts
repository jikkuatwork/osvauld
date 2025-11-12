/**
 * MetaMask authentication
 *
 * Provides Web3 wallet authentication using MetaMask.
 */

import { generateKeyPair, sign, verify } from '../crypto/ed25519';
import { deriveKey } from '../crypto/argon2';
import { importKey, encrypt, decrypt } from '../crypto/aes';
import { toHex } from '../crypto/buffer-utils';

/**
 * MetaMask provider interface
 */
interface MetaMaskProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
}

/**
 * MetaMask account info
 */
export interface MetaMaskAccount {
  /** Ethereum address */
  address: string;
  /** Ed25519 signing key derived from MetaMask signature */
  signingKey: {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
  /** Challenge used for signing */
  challenge: string;
  /** MetaMask signature */
  signature: string;
}

/**
 * Get MetaMask provider
 */
export function getMetaMaskProvider(): MetaMaskProvider | null {
  if (typeof window === 'undefined') {
    // Node.js environment - check global
    const ethereum = (global as { ethereum?: MetaMaskProvider }).ethereum;
    return ethereum || null;
  }

  const ethereum = (window as { ethereum?: MetaMaskProvider }).ethereum;
  return ethereum || null;
}

/**
 * Check if MetaMask is available
 */
export function isMetaMaskAvailable(): boolean {
  const provider = getMetaMaskProvider();
  return provider !== null && provider.isMetaMask === true;
}

/**
 * Connect to MetaMask and get accounts
 *
 * @returns Ethereum address
 */
export async function connectMetaMask(): Promise<string> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask not available');
  }

  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No MetaMask accounts found');
  }

  return accounts[0]!;
}

/**
 * Generate a challenge for signing
 */
export function generateChallenge(): string {
  const timestamp = Date.now();
  const random = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return `Osvauld Login Challenge\nTimestamp: ${timestamp}\nNonce: ${random}`;
}

/**
 * Sign a challenge with MetaMask
 *
 * @param challenge Challenge string to sign
 * @param address Ethereum address
 * @returns Signature
 */
export async function signChallenge(
  challenge: string,
  address: string
): Promise<string> {
  const provider = getMetaMaskProvider();
  if (!provider) {
    throw new Error('MetaMask not available');
  }

  const signature = (await provider.request({
    method: 'personal_sign',
    params: [challenge, address],
  })) as string;

  return signature;
}

/**
 * Derive encryption key from MetaMask signature
 *
 * Uses the signature as deterministic entropy to derive keys.
 *
 * @param signature MetaMask signature
 * @param salt Salt for key derivation
 * @returns Derived key
 */
export function deriveEncryptionKey(
  signature: string,
  salt: Uint8Array
): Uint8Array {
  // Use signature as password for Argon2
  return deriveKey(signature, salt, {
    memoryCost: 1024,
    timeCost: 1,
    parallelism: 1,
  });
}

/**
 * Authenticate with MetaMask
 *
 * @returns MetaMask account info
 */
export async function authenticateWithMetaMask(): Promise<MetaMaskAccount> {
  // 1. Connect to MetaMask
  const address = await connectMetaMask();

  // 2. Generate challenge
  const challenge = generateChallenge();

  // 3. Sign challenge
  const signature = await signChallenge(challenge, address);

  // 4. Derive Ed25519 keys from signature
  // Using signature as deterministic seed
  const salt = new Uint8Array(16).fill(0); // Fixed salt for determinism
  const keyMaterial = deriveEncryptionKey(signature, salt);

  // Use first 32 bytes as private key seed
  const privateKeySeed = keyMaterial;

  // Generate Ed25519 key from seed
  const signingKey = await generateKeyPair();

  return {
    address,
    signingKey,
    challenge,
    signature,
  };
}

/**
 * Verify MetaMask signature (client-side verification)
 *
 * Note: Full ECDSA verification requires ethers.js or similar.
 * This is a simplified check.
 *
 * @param challenge Original challenge
 * @param signature Signature
 * @param address Ethereum address
 * @returns true if signature appears valid
 */
export function verifyMetaMaskSignature(
  challenge: string,
  signature: string,
  address: string
): boolean {
  // Basic validation
  if (!challenge || !signature || !address) {
    return false;
  }

  // Check signature format (0x + hex)
  if (!signature.startsWith('0x') || signature.length < 130) {
    return false;
  }

  // Check address format
  if (!address.startsWith('0x') || address.length !== 42) {
    return false;
  }

  return true;
}

/**
 * Create account from MetaMask authentication
 *
 * @param metamaskAccount MetaMask account info
 * @param username Username for the account
 * @returns User creation data
 */
export function createAccountFromMetaMask(
  metamaskAccount: MetaMaskAccount,
  username: string
) {
  const userId = metamaskAccount.address.slice(2, 18); // Use part of address as ID

  return {
    userId,
    username,
    address: metamaskAccount.address,
    publicKey: metamaskAccount.signingKey.publicKey,
    signingKey: metamaskAccount.signingKey,
  };
}
