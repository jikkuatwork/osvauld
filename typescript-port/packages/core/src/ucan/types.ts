/**
 * UCAN (User Controlled Authorization Networks) Types
 *
 * Simplified UCAN implementation for capability-based authorization.
 */

/**
 * UCAN capabilities/permissions
 */
export enum Capability {
  READ = 'read',
  WRITE = 'write',
  SHARE = 'share',
  DELETE = 'delete',
}

/**
 * Resource identifier
 */
export interface Resource {
  type: 'document' | 'folder' | 'all';
  id?: string;
}

/**
 * Attestation/capability grant
 */
export interface Attestation {
  resource: Resource;
  capabilities: Capability[];
}

/**
 * UCAN token payload
 */
export interface UCANPayload {
  iss: string; // Issuer (public key)
  aud: string; // Audience (recipient public key)
  sub?: string; // Subject (optional)
  exp: number; // Expiration timestamp
  nbf?: number; // Not before timestamp
  att: Attestation[]; // Attestations (capabilities)
  prf?: string[]; // Proofs (parent UCAN tokens)
  fct?: Record<string, unknown>; // Facts (additional metadata)
}

/**
 * UCAN token structure
 */
export interface UCAN {
  header: {
    alg: string;
    typ: 'JWT';
  };
  payload: UCANPayload;
  signature: string;
}

/**
 * Share link structure
 */
export interface ShareLink {
  id: string;
  documentId: string;
  token: string; // Encoded UCAN token
  capabilities: Capability[];
  expiresAt: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * Share request
 */
export interface ShareRequest {
  documentId: string;
  recipientPublicKey: string;
  capabilities: Capability[];
  expiresIn?: number; // Milliseconds
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  payload?: UCANPayload;
  error?: string;
}
