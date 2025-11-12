import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { SharingManager } from '../../../src/sharing/manager';
import { ShareLinkRepository } from '../../../src/storage/repositories/share-link';
import { initDatabase } from '../../../src/storage/indexeddb';
import { Capability } from '../../../src/ucan/types';
import { generateKeyPair } from '../../../src/crypto/ed25519';

describe('Sharing Manager', () => {
  let manager: SharingManager;
  let shareLinkRepo: ShareLinkRepository;
  let issuerKeys: { privateKey: Uint8Array; publicKey: Uint8Array };
  let recipientKeys: { privateKey: Uint8Array; publicKey: Uint8Array };

  beforeEach(async () => {
    const db = initDatabase(`test-${Date.now()}`);
    shareLinkRepo = new ShareLinkRepository(db.shareLinks);
    manager = new SharingManager(shareLinkRepo);

    issuerKeys = await generateKeyPair();
    recipientKeys = await generateKeyPair();
  });

  const encodePublicKey = (key: Uint8Array): string => {
    const base64 = btoa(String.fromCharCode(...key));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  describe('createShareLink', () => {
    it('should create a share link', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
          expiresIn: 24 * 60 * 60 * 1000, // 24 hours
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      expect(shareLink.id).toBeDefined();
      expect(shareLink.documentId).toBe('doc-1');
      expect(shareLink.token).toBeDefined();
      expect(shareLink.capabilities).toContain(Capability.READ);
      expect(shareLink.expiresAt).toBeInstanceOf(Date);
    });

    it('should create share link with multiple capabilities', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ, Capability.WRITE],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      expect(shareLink.capabilities).toContain(Capability.READ);
      expect(shareLink.capabilities).toContain(Capability.WRITE);
    });

    it('should create share link with default expiration', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const expiresAt = shareLink.expiresAt.getTime();
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThanOrEqual(now + sevenDays + 1000); // Allow 1s tolerance
    });
  });

  describe('revokeShareLink', () => {
    it('should revoke a share link', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      await manager.revokeShareLink(shareLink.id);

      const result = await manager.verifyShareLink(shareLink.id);
      expect(result.valid).toBe(false);
    });
  });

  describe('getShareLinks', () => {
    it('should get all share links for a document', async () => {
      await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.WRITE],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const links = await manager.getShareLinks('doc-1');

      expect(links.length).toBe(2);
    });

    it('should filter by document ID', async () => {
      await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      await manager.createShareLink(
        {
          documentId: 'doc-2',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const links = await manager.getShareLinks('doc-1');

      expect(links.length).toBe(1);
      expect(links[0]?.documentId).toBe('doc-1');
    });
  });

  describe('verifyShareLink', () => {
    it('should verify valid share link', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const result = await manager.verifyShareLink(shareLink.id);

      expect(result.valid).toBe(true);
      expect(result.capabilities).toContain(Capability.READ);
    });

    it('should reject non-existent share link', async () => {
      const result = await manager.verifyShareLink('non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share link not found');
    });

    it('should reject expired share link', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
          expiresIn: -1000, // Already expired
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const result = await manager.verifyShareLink(shareLink.id);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Share link expired');
    });
  });

  describe('verifyAccess', () => {
    it('should verify access with valid token', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const hasAccess = await manager.verifyAccess(
        shareLink.token,
        'doc-1',
        Capability.READ
      );

      expect(hasAccess).toBe(true);
    });

    it('should reject access without capability', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const hasAccess = await manager.verifyAccess(
        shareLink.token,
        'doc-1',
        Capability.WRITE
      );

      expect(hasAccess).toBe(false);
    });

    it('should reject access to different document', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const hasAccess = await manager.verifyAccess(
        shareLink.token,
        'doc-2',
        Capability.READ
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe('getDocumentCapabilities', () => {
    it('should get all capabilities for a document', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ, Capability.WRITE],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const caps = await manager.getDocumentCapabilities(shareLink.token, 'doc-1');

      expect(caps).toContain(Capability.READ);
      expect(caps).toContain(Capability.WRITE);
    });

    it('should return empty array for different document', async () => {
      const shareLink = await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const caps = await manager.getDocumentCapabilities(shareLink.token, 'doc-2');

      expect(caps).toHaveLength(0);
    });
  });

  describe('cleanupExpiredLinks', () => {
    it('should remove expired links', async () => {
      await manager.createShareLink(
        {
          documentId: 'doc-1',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
          expiresIn: -1000, // Expired
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      await manager.createShareLink(
        {
          documentId: 'doc-2',
          recipientPublicKey: encodePublicKey(recipientKeys.publicKey),
          capabilities: [Capability.READ],
          expiresIn: 24 * 60 * 60 * 1000, // Valid
        },
        issuerKeys.privateKey,
        issuerKeys.publicKey
      );

      const count = await manager.cleanupExpiredLinks();

      expect(count).toBe(1);

      const allLinks = await shareLinkRepo.list();
      expect(allLinks.length).toBe(1);
    });
  });
});
