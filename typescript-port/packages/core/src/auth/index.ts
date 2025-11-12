/**
 * Authentication module
 *
 * Provides multiple authentication methods:
 * - Mnemonic-based (BIP39)
 * - MetaMask (Web3 wallet)
 * - Passkey (WebAuthn/FIDO2)
 */

export * from './mnemonic';
export * from './metamask';
export * from './passkey';
export * from './session';
