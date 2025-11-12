/**
 * Share Link Types
 */

import type { Capability } from '../ucan/types';

/**
 * Share link for document sharing
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
