import { describe, it, expect, beforeAll } from 'vitest';
import {
  createUCAN,
  verifyUCAN,
  hasCapability,
  getResourceCapabilities,
  decodeUCAN,
} from '../../../src/ucan/token';
import { Capability } from '../../../src/ucan/types';
import { generateKeyPair } from '../../../src/crypto/ed25519';

describe('UCAN Token', () => {
  let issuerKeys: { privateKey: Uint8Array; publicKey: Uint8Array };
  let recipientKeys: { privateKey: Uint8Array; publicKey: Uint8Array };

  beforeAll(async () => {
    issuerKeys = await generateKeyPair();
    recipientKeys = await generateKeyPair();
  });

  describe('createUCAN', () => {
    it('should create a valid UCAN token', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should create token with custom expiration', async () => {
      const expiresIn = 60 * 60 * 1000; // 1 hour

      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ, Capability.WRITE],
          },
        ],
        { expiresIn }
      );

      const decoded = decodeUCAN(token);
      expect(decoded).toBeDefined();
      expect(decoded!.payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should create token with multiple attestations', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
          {
            resource: { type: 'document', id: 'doc-2' },
            capabilities: [Capability.WRITE],
          },
        ]
      );

      const decoded = decodeUCAN(token);
      expect(decoded!.payload.att).toHaveLength(2);
    });

    it('should create token with all resource type', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'all' },
            capabilities: [Capability.READ, Capability.WRITE],
          },
        ]
      );

      const decoded = decodeUCAN(token);
      expect(decoded!.payload.att[0]?.resource.type).toBe('all');
    });
  });

  describe('verifyUCAN', () => {
    it('should verify a valid token', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      const result = await verifyUCAN(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token format', async () => {
      const result = await verifyUCAN('invalid.token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject token with invalid signature', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      // Tamper with signature
      const parts = token.split('.');
      parts[2] = 'invalidsignature';
      const tamperedToken = parts.join('.');

      const result = await verifyUCAN(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ],
        { expiresIn: -1000 } // Already expired
      );

      const result = await verifyUCAN(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject token not yet valid', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ],
        { notBefore: new Date(Date.now() + 60 * 60 * 1000) } // 1 hour in future
      );

      const result = await verifyUCAN(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not yet valid');
    });
  });

  describe('hasCapability', () => {
    it('should find exact capability match', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ, Capability.WRITE],
          },
        ]
      );

      const result = await verifyUCAN(token);
      expect(result.payload).toBeDefined();

      const has = hasCapability(
        result.payload!,
        { type: 'document', id: 'doc-1' },
        Capability.READ
      );

      expect(has).toBe(true);
    });

    it('should not find capability for different resource', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      const result = await verifyUCAN(token);

      const has = hasCapability(
        result.payload!,
        { type: 'document', id: 'doc-2' },
        Capability.READ
      );

      expect(has).toBe(false);
    });

    it('should match capability with all resource type', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'all' },
            capabilities: [Capability.READ],
          },
        ]
      );

      const result = await verifyUCAN(token);

      const has = hasCapability(
        result.payload!,
        { type: 'document', id: 'doc-1' },
        Capability.READ
      );

      expect(has).toBe(true);
    });
  });

  describe('getResourceCapabilities', () => {
    it('should get all capabilities for a resource', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ, Capability.WRITE],
          },
        ]
      );

      const result = await verifyUCAN(token);

      const caps = getResourceCapabilities(result.payload!, {
        type: 'document',
        id: 'doc-1',
      });

      expect(caps).toContain(Capability.READ);
      expect(caps).toContain(Capability.WRITE);
    });

    it('should return empty array for unmatched resource', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      const result = await verifyUCAN(token);

      const caps = getResourceCapabilities(result.payload!, {
        type: 'document',
        id: 'doc-2',
      });

      expect(caps).toHaveLength(0);
    });
  });

  describe('decodeUCAN', () => {
    it('should decode valid token', async () => {
      const token = await createUCAN(
        issuerKeys.privateKey,
        issuerKeys.publicKey,
        recipientKeys.publicKey,
        [
          {
            resource: { type: 'document', id: 'doc-1' },
            capabilities: [Capability.READ],
          },
        ]
      );

      const decoded = decodeUCAN(token);

      expect(decoded).toBeDefined();
      expect(decoded!.header.alg).toBe('EdDSA');
      expect(decoded!.payload.att).toHaveLength(1);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeUCAN('invalid');

      expect(decoded).toBeNull();
    });
  });
});
