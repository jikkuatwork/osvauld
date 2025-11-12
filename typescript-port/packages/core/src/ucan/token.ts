/**
 * UCAN Token Generation and Verification
 *
 * Handles creation and validation of UCAN tokens.
 */

import { sign, verify } from '@noble/ed25519';
import type {
  UCAN,
  UCANPayload,
  Attestation,
  Resource,
  Capability,
  VerificationResult,
} from './types';

/**
 * Encodes data to base64url
 */
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decodes base64url to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Encodes object to base64url JSON
 */
function encodeJSON(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  return base64urlEncode(bytes);
}

/**
 * Decodes base64url JSON to object
 */
function decodeJSON<T>(str: string): T {
  const bytes = base64urlDecode(str);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

/**
 * Creates a UCAN token
 */
export async function createUCAN(
  issuerPrivateKey: Uint8Array,
  issuerPublicKey: Uint8Array,
  audiencePublicKey: Uint8Array,
  attestations: Attestation[],
  options: {
    expiresIn?: number; // Milliseconds from now
    notBefore?: Date;
    proofs?: string[];
    facts?: Record<string, unknown>;
  } = {}
): Promise<string> {
  const now = Date.now();
  const exp = options.expiresIn ? now + options.expiresIn : now + 24 * 60 * 60 * 1000; // Default 24h

  const header = {
    alg: 'EdDSA',
    typ: 'JWT' as const,
  };

  const payload: UCANPayload = {
    iss: base64urlEncode(issuerPublicKey),
    aud: base64urlEncode(audiencePublicKey),
    exp: Math.floor(exp / 1000), // Unix timestamp
    att: attestations,
  };

  if (options.notBefore) {
    payload.nbf = Math.floor(options.notBefore.getTime() / 1000);
  }

  if (options.proofs && options.proofs.length > 0) {
    payload.prf = options.proofs;
  }

  if (options.facts) {
    payload.fct = options.facts;
  }

  // Create signing input
  const headerEncoded = encodeJSON(header);
  const payloadEncoded = encodeJSON(payload);
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  // Sign
  const signingBytes = new TextEncoder().encode(signingInput);
  const signature = await sign(signingBytes, issuerPrivateKey);

  // Encode signature
  const signatureEncoded = base64urlEncode(signature);

  return `${signingInput}.${signatureEncoded}`;
}

/**
 * Verifies a UCAN token
 */
export async function verifyUCAN(token: string): Promise<VerificationResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Ensure all parts exist
    if (!headerEncoded || !payloadEncoded || !signatureEncoded) {
      return { valid: false, error: 'Invalid token format - missing parts' };
    }

    // Decode parts
    const header = decodeJSON<UCAN['header']>(headerEncoded);
    const payload = decodeJSON<UCANPayload>(payloadEncoded);
    const signature = base64urlDecode(signatureEncoded);

    // Check algorithm
    if (header.alg !== 'EdDSA') {
      return { valid: false, error: 'Unsupported algorithm' };
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // Check not-before
    if (payload.nbf && payload.nbf > now) {
      return { valid: false, error: 'Token not yet valid' };
    }

    // Verify signature
    const signingInput = `${headerEncoded}.${payloadEncoded}`;
    const signingBytes = new TextEncoder().encode(signingInput);
    const issuerPublicKey = base64urlDecode(payload.iss);

    const valid = await verify(signature, signingBytes, issuerPublicKey);

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks if a UCAN grants a specific capability
 */
export function hasCapability(
  payload: UCANPayload,
  resource: Resource,
  capability: Capability
): boolean {
  return payload.att.some((att) => {
    // Check resource match
    const resourceMatches =
      att.resource.type === 'all' ||
      (att.resource.type === resource.type &&
        (att.resource.id === undefined || att.resource.id === resource.id));

    // Check capability
    const hasCapability = att.capabilities.includes(capability);

    return resourceMatches && hasCapability;
  });
}

/**
 * Extracts attestations for a specific resource
 */
export function getResourceCapabilities(
  payload: UCANPayload,
  resource: Resource
): Capability[] {
  const capabilities = new Set<Capability>();

  payload.att.forEach((att) => {
    const matches =
      att.resource.type === 'all' ||
      (att.resource.type === resource.type &&
        (att.resource.id === undefined || att.resource.id === resource.id));

    if (matches) {
      att.capabilities.forEach((cap) => capabilities.add(cap));
    }
  });

  return Array.from(capabilities);
}

/**
 * Decodes a UCAN token without verification
 */
export function decodeUCAN(token: string): UCAN | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Ensure all parts exist
    if (!headerEncoded || !payloadEncoded || !signatureEncoded) {
      return null;
    }

    return {
      header: decodeJSON<UCAN['header']>(headerEncoded),
      payload: decodeJSON<UCANPayload>(payloadEncoded),
      signature: signatureEncoded,
    };
  } catch {
    return null;
  }
}
