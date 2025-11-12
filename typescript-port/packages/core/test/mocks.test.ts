import { describe, it, expect, beforeEach } from 'vitest';
import {
  isIndexedDBAvailable,
  MockPeerConnection,
  createMockPeerPair,
  MockSignaling,
  MockMetaMask,
} from './mocks';

describe('Test Mocks', () => {
  describe('IndexedDB Mock', () => {
    it('should have IndexedDB available', () => {
      expect(isIndexedDBAvailable()).toBe(true);
    });

    it('should have global indexedDB', () => {
      expect(indexedDB).toBeDefined();
    });
  });

  describe('WebRTC Mock', () => {
    it('should create mock peer connection', () => {
      const peer = new MockPeerConnection('test-peer');
      expect(peer.id).toBe('test-peer');
      expect(peer.connected).toBe(false);
    });

    it('should connect two peers', () => {
      const [peer1, peer2] = createMockPeerPair();
      expect(peer1.connected).toBe(true);
      expect(peer2.connected).toBe(true);
    });

    it('should send data between peers', async () => {
      const [peer1, peer2] = createMockPeerPair();
      const testData = { message: 'hello' };

      const dataPromise = new Promise((resolve) => {
        peer2.on('data', (data) => {
          expect(data).toEqual(testData);
          resolve(data);
        });
      });

      peer1.send(testData);
      await dataPromise;
    });

    it('should disconnect peers', () => {
      const [peer1, peer2] = createMockPeerPair();
      peer1.disconnect();
      expect(peer1.connected).toBe(false);
      expect(peer2.connected).toBe(false);
    });

    it('should handle mock signaling', () => {
      const signaling = new MockSignaling();
      const offer = { sdp: 'mock-sdp' };
      signaling.sendOffer('test-id', offer);
      expect(signaling.getOffer('test-id')).toEqual(offer);
    });
  });

  describe('MetaMask Mock', () => {
    let metamask: MockMetaMask;

    beforeEach(() => {
      metamask = new MockMetaMask();
    });

    it('should have accounts', () => {
      expect(metamask.selectedAddress).toBeTruthy();
    });

    it('should request accounts', async () => {
      const accounts = await metamask.request({
        method: 'eth_requestAccounts',
      });
      expect(Array.isArray(accounts)).toBe(true);
      expect((accounts as string[]).length).toBeGreaterThan(0);
    });

    it('should sign messages', async () => {
      const signature = await metamask.request({
        method: 'personal_sign',
        params: ['message', '0x123'],
      });
      expect(typeof signature).toBe('string');
      expect(signature).toContain('0xmocksignature');
    });
  });
});
