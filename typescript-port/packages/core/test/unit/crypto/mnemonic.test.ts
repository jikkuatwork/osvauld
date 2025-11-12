import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveKeyPair,
  deriveMultipleKeys,
  getDerivationPath,
  generateMnemonicWithKey,
  recoverFromMnemonic,
  MnemonicStrength,
} from '../../../src/crypto/mnemonic';

describe('BIP39 Mnemonic', () => {
  describe('Mnemonic Generation', () => {
    it('should generate a 12-word mnemonic', () => {
      const mnemonic = generateMnemonic(MnemonicStrength.Words12);

      expect(typeof mnemonic).toBe('string');
      expect(mnemonic.split(' ').length).toBe(12);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate a 24-word mnemonic', () => {
      const mnemonic = generateMnemonic(MnemonicStrength.Words24);

      expect(typeof mnemonic).toBe('string');
      expect(mnemonic.split(' ').length).toBe(24);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate unique mnemonics', () => {
      const mnemonic1 = generateMnemonic();
      const mnemonic2 = generateMnemonic();

      expect(mnemonic1).not.toBe(mnemonic2);
    });

    it('should default to 12 words', () => {
      const mnemonic = generateMnemonic();

      expect(mnemonic.split(' ').length).toBe(12);
    });
  });

  describe('Mnemonic Validation', () => {
    it('should validate valid mnemonic', () => {
      const mnemonic = generateMnemonic();

      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should reject invalid mnemonic', () => {
      const invalid = 'invalid mnemonic phrase test words';

      expect(validateMnemonic(invalid)).toBe(false);
    });

    it('should reject mnemonic with wrong checksum', () => {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(' ');
      // Change last word (contains checksum)
      words[words.length - 1] = 'abandon';
      const invalid = words.join(' ');

      expect(validateMnemonic(invalid)).toBe(false);
    });
  });

  describe('Seed Generation', () => {
    it('should convert mnemonic to seed', async () => {
      const mnemonic = generateMnemonic();

      const seed = await mnemonicToSeed(mnemonic);

      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(64);
    });

    it('should produce same seed for same mnemonic', async () => {
      const mnemonic = generateMnemonic();

      const seed1 = await mnemonicToSeed(mnemonic);
      const seed2 = await mnemonicToSeed(mnemonic);

      expect(seed1).toEqual(seed2);
    });

    it('should produce different seeds for different mnemonics', async () => {
      const mnemonic1 = generateMnemonic();
      const mnemonic2 = generateMnemonic();

      const seed1 = await mnemonicToSeed(mnemonic1);
      const seed2 = await mnemonicToSeed(mnemonic2);

      expect(seed1).not.toEqual(seed2);
    });

    it('should support optional passphrase', async () => {
      const mnemonic = generateMnemonic();

      const seed1 = await mnemonicToSeed(mnemonic, '');
      const seed2 = await mnemonicToSeed(mnemonic, 'passphrase');

      expect(seed1).not.toEqual(seed2);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key pair from seed', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);

      const keyPair = deriveKeyPair(seed, "m/44'/0'/0'/0/0");

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.chainCode).toBeInstanceOf(Uint8Array);
      expect(keyPair.path).toBe("m/44'/0'/0'/0/0");
    });

    it('should produce same key for same path', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);

      const keyPair1 = deriveKeyPair(seed, "m/44'/0'/0'/0/0");
      const keyPair2 = deriveKeyPair(seed, "m/44'/0'/0'/0/0");

      expect(keyPair1.publicKey).toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).toEqual(keyPair2.privateKey);
    });

    it('should produce different keys for different paths', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);

      const keyPair1 = deriveKeyPair(seed, "m/44'/0'/0'/0/0");
      const keyPair2 = deriveKeyPair(seed, "m/44'/0'/0'/0/1");

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });

    it('should derive multiple keys', async () => {
      const mnemonic = generateMnemonic();
      const paths = ["m/44'/0'/0'/0/0", "m/44'/0'/0'/0/1", "m/44'/0'/0'/0/2"];

      const keyPairs = await deriveMultipleKeys(mnemonic, paths);

      expect(keyPairs.length).toBe(3);
      expect(keyPairs[0]!.publicKey).not.toEqual(keyPairs[1]!.publicKey);
      expect(keyPairs[1]!.publicKey).not.toEqual(keyPairs[2]!.publicKey);
    });
  });

  describe('Derivation Paths', () => {
    it('should generate default derivation path', () => {
      const path = getDerivationPath();

      expect(path).toBe("m/44'/0'/0'/0/0");
    });

    it('should generate path with custom account', () => {
      const path = getDerivationPath(1);

      expect(path).toBe("m/44'/0'/1'/0/0");
    });

    it('should generate path with custom index', () => {
      const path = getDerivationPath(0, 5);

      expect(path).toBe("m/44'/0'/0'/0/5");
    });
  });

  describe('Combined Operations', () => {
    it('should generate mnemonic with key', async () => {
      const result = await generateMnemonicWithKey();

      expect(typeof result.mnemonic).toBe('string');
      expect(result.keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(result.keyPair.path).toBe("m/44'/0'/0'/0/0");
    });

    it('should recover from mnemonic', async () => {
      const { mnemonic, keyPair: original } = await generateMnemonicWithKey();

      const recovered = await recoverFromMnemonic(mnemonic);

      expect(recovered.publicKey).toEqual(original.publicKey);
      expect(recovered.privateKey).toEqual(original.privateKey);
    });

    it('should recover with custom path', async () => {
      const mnemonic = generateMnemonic();
      const customPath = "m/44'/0'/0'/0/5";

      const keyPair = await recoverFromMnemonic(mnemonic, customPath);

      expect(keyPair.path).toBe(customPath);
    });

    it('should reject invalid mnemonic on recovery', async () => {
      await expect(
        recoverFromMnemonic('invalid mnemonic phrase')
      ).rejects.toThrow(/Invalid mnemonic/);
    });
  });

  describe('Deterministic Recovery', () => {
    it('should recover same keys from mnemonic', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);

      // Derive keys
      const key1 = deriveKeyPair(seed, "m/44'/0'/0'/0/0");
      const key2 = deriveKeyPair(seed, "m/44'/0'/0'/0/1");

      // Simulate recovery
      const recoveredSeed = await mnemonicToSeed(mnemonic);
      const recoveredKey1 = deriveKeyPair(recoveredSeed, "m/44'/0'/0'/0/0");
      const recoveredKey2 = deriveKeyPair(recoveredSeed, "m/44'/0'/0'/0/1");

      expect(recoveredKey1.privateKey).toEqual(key1.privateKey);
      expect(recoveredKey2.privateKey).toEqual(key2.privateKey);
    });
  });

  describe('Edge Cases', () => {
    it('should handle different mnemonic strengths', () => {
      const mnemonic12 = generateMnemonic(MnemonicStrength.Words12);
      const mnemonic15 = generateMnemonic(MnemonicStrength.Words15);
      const mnemonic18 = generateMnemonic(MnemonicStrength.Words18);
      const mnemonic21 = generateMnemonic(MnemonicStrength.Words21);
      const mnemonic24 = generateMnemonic(MnemonicStrength.Words24);

      expect(mnemonic12.split(' ').length).toBe(12);
      expect(mnemonic15.split(' ').length).toBe(15);
      expect(mnemonic18.split(' ').length).toBe(18);
      expect(mnemonic21.split(' ').length).toBe(21);
      expect(mnemonic24.split(' ').length).toBe(24);
    });

    it('should handle deep derivation paths', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);

      const keyPair = deriveKeyPair(seed, "m/44'/0'/0'/0/100");

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Performance', () => {
    it('should generate mnemonic quickly', () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        generateMnemonic();
      }

      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`Mnemonic generation: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(10);
    });

    it('should derive keys quickly', async () => {
      const mnemonic = generateMnemonic();
      const seed = await mnemonicToSeed(mnemonic);
      const iterations = 100;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        deriveKeyPair(seed, `m/44'/0'/0'/0/${i}`);
      }

      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / iterations;

      console.log(`Key derivation: ${avgTime.toFixed(2)}ms per operation`);
      expect(avgTime).toBeLessThan(5);
    });
  });
});
