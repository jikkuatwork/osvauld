import { describe, it, expect } from 'vitest';
import {
  generateRandomBytes,
  hexToBytes,
  bytesToHex,
  waitFor,
  sleep,
  mockStorage,
} from './helpers';

describe('Test Helpers', () => {
  describe('Crypto Helpers', () => {
    it('should generate random bytes', () => {
      const bytes = generateRandomBytes(32);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('should convert hex to bytes', () => {
      const hex = '48656c6c6f';
      const bytes = hexToBytes(hex);
      expect(bytes).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should convert bytes to hex', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const hex = bytesToHex(bytes);
      expect(hex).toBe('48656c6c6f');
    });

    it('should roundtrip hex <-> bytes', () => {
      const original = generateRandomBytes(32);
      const hex = bytesToHex(original);
      const decoded = hexToBytes(hex);
      expect(decoded).toEqual(original);
    });
  });

  describe('Async Helpers', () => {
    it('should wait for condition', async () => {
      let flag = false;
      setTimeout(() => {
        flag = true;
      }, 100);

      await waitFor(() => flag, 1000);
      expect(flag).toBe(true);
    });

    it('should timeout if condition not met', async () => {
      await expect(waitFor(() => false, 100)).rejects.toThrow(/Timeout/);
    });

    it('should sleep for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });
  });

  describe('Storage Helpers', () => {
    it('should create mock storage', () => {
      const storage = mockStorage();
      expect(storage).toBeDefined();
      expect(storage.size()).toBe(0);
    });

    it('should store and retrieve values', () => {
      const storage = mockStorage();
      storage.set('key', 'value');
      expect(storage.get('key')).toBe('value');
    });

    it('should delete values', () => {
      const storage = mockStorage();
      storage.set('key', 'value');
      storage.delete('key');
      expect(storage.has('key')).toBe(false);
    });

    it('should clear all values', () => {
      const storage = mockStorage();
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.clear();
      expect(storage.size()).toBe(0);
    });
  });
});
