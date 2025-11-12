/**
 * Sharing Manager
 *
 * Manages document sharing using UCAN tokens.
 */

import { createUCAN, verifyUCAN, hasCapability } from '../ucan/token';
import type {
  ShareLink,
  ShareRequest,
  Capability,
  Resource,
  UCANPayload,
} from '../ucan/types';
import type { ShareLinkRepository } from '../storage/repositories/share-link';

/**
 * Share manager for document sharing
 */
export class SharingManager {
  constructor(private shareLinkRepo: ShareLinkRepository) {}

  /**
   * Creates a share link for a document
   */
  async createShareLink(
    request: ShareRequest,
    issuerPrivateKey: Uint8Array,
    issuerPublicKey: Uint8Array
  ): Promise<ShareLink> {
    const recipientPublicKey = this.parsePublicKey(request.recipientPublicKey);

    // Create UCAN token
    const expiresIn = request.expiresIn || 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const token = await createUCAN(
      issuerPrivateKey,
      issuerPublicKey,
      recipientPublicKey,
      [
        {
          resource: {
            type: 'document',
            id: request.documentId,
          },
          capabilities: request.capabilities,
        },
      ],
      { expiresIn }
    );

    // Create share link record
    const shareLink: ShareLink = {
      id: this.generateShareId(),
      documentId: request.documentId,
      token,
      capabilities: request.capabilities,
      expiresAt: new Date(Date.now() + expiresIn),
      createdBy: this.encodePublicKey(issuerPublicKey),
      createdAt: new Date(),
    };

    await this.shareLinkRepo.create(shareLink);

    return shareLink;
  }

  /**
   * Revokes a share link
   */
  async revokeShareLink(shareLinkId: string): Promise<void> {
    await this.shareLinkRepo.delete(shareLinkId);
  }

  /**
   * Gets all share links for a document
   */
  async getShareLinks(documentId: string): Promise<ShareLink[]> {
    const allLinks = await this.shareLinkRepo.list();
    return allLinks.filter((link) => link.documentId === documentId);
  }

  /**
   * Verifies a share link and returns capabilities
   */
  async verifyShareLink(
    shareLinkId: string
  ): Promise<{ valid: boolean; capabilities?: Capability[]; error?: string }> {
    const shareLink = await this.shareLinkRepo.findById(shareLinkId);

    if (!shareLink) {
      return { valid: false, error: 'Share link not found' };
    }

    // Check if expired
    if (shareLink.expiresAt < new Date()) {
      return { valid: false, error: 'Share link expired' };
    }

    // Verify UCAN token
    const result = await verifyUCAN(shareLink.token);

    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      capabilities: shareLink.capabilities,
    };
  }

  /**
   * Verifies access to a document with a UCAN token
   */
  async verifyAccess(
    token: string,
    documentId: string,
    requiredCapability: Capability
  ): Promise<boolean> {
    const result = await verifyUCAN(token);

    if (!result.valid || !result.payload) {
      return false;
    }

    const resource: Resource = {
      type: 'document',
      id: documentId,
    };

    return hasCapability(result.payload, resource, requiredCapability);
  }

  /**
   * Gets all capabilities for a document from a token
   */
  async getDocumentCapabilities(
    token: string,
    documentId: string
  ): Promise<Capability[]> {
    const result = await verifyUCAN(token);

    if (!result.valid || !result.payload) {
      return [];
    }

    const resource: Resource = {
      type: 'document',
      id: documentId,
    };

    const capabilities: Capability[] = [];

    result.payload.att.forEach((att) => {
      const matches =
        att.resource.type === 'all' ||
        (att.resource.type === 'document' &&
          (att.resource.id === undefined || att.resource.id === documentId));

      if (matches) {
        capabilities.push(...att.capabilities);
      }
    });

    return Array.from(new Set(capabilities));
  }

  /**
   * Lists all share links created by a user
   */
  async listUserShareLinks(userId: string): Promise<ShareLink[]> {
    const allLinks = await this.shareLinkRepo.list();
    return allLinks.filter((link) => link.createdBy === userId);
  }

  /**
   * Cleans up expired share links
   */
  async cleanupExpiredLinks(): Promise<number> {
    const allLinks = await this.shareLinkRepo.list();
    const now = new Date();
    let count = 0;

    for (const link of allLinks) {
      if (link.expiresAt < now) {
        await this.shareLinkRepo.delete(link.id);
        count++;
      }
    }

    return count;
  }

  private generateShareId(): string {
    return `share-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private parsePublicKey(key: string): Uint8Array {
    // In sandbox, assume base64url encoded
    const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }

  private encodePublicKey(key: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...key));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

/**
 * Creates a sharing manager
 */
export function createSharingManager(shareLinkRepo: ShareLinkRepository): SharingManager {
  return new SharingManager(shareLinkRepo);
}
