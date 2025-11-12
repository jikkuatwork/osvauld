import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAccount,
  createUserData,
  login,
  recoverAccount,
  changePassword,
  type AccountInfo,
} from '../../../src/auth/mnemonic';
import { MnemonicStrength, validateMnemonic } from '../../../src/crypto/mnemonic';
import type { User } from '../../../src/types';

describe('Mnemonic Authentication', () => {
  describe('Account Creation', () => {
    it('should create account with mnemonic', async () => {
      const account = await createAccount('testuser', 'password123');

      expect(account.userId).toBeDefined();
      expect(account.username).toBe('testuser');
      expect(account.mnemonic).toBeDefined();
      expect(validateMnemonic(account.mnemonic)).toBe(true);
      expect(account.signingKey).toBeDefined();
      expect(account.encryptedMnemonic).toBeDefined();
      expect(account.salt).toBeDefined();
    });

    it('should create account with 12-word mnemonic by default', async () => {
      const account = await createAccount('testuser', 'password123');

      const wordCount = account.mnemonic.split(' ').length;
      expect(wordCount).toBe(12);
    });

    it('should create account with custom mnemonic strength', async () => {
      const account = await createAccount(
        'testuser',
        'password123',
        MnemonicStrength.Words24
      );

      const wordCount = account.mnemonic.split(' ').length;
      expect(wordCount).toBe(24);
    });

    it('should generate unique accounts', async () => {
      const account1 = await createAccount('user1', 'password');
      const account2 = await createAccount('user2', 'password');

      expect(account1.userId).not.toBe(account2.userId);
      expect(account1.mnemonic).not.toBe(account2.mnemonic);
    });

    it('should encrypt mnemonic', async () => {
      const account = await createAccount('testuser', 'password123');

      // Encrypted mnemonic should not contain the plaintext
      const encryptedString = Buffer.from(
        account.encryptedMnemonic.ciphertext
      ).toString();
      expect(encryptedString).not.toContain(account.mnemonic);
    });
  });

  describe('User Data Creation', () => {
    it('should create user data for storage', async () => {
      const account = await createAccount('testuser', 'password123');
      const encryptedPrivateKey = account.signingKey.privateKey; // Simplified

      const userData = createUserData(account, encryptedPrivateKey);

      expect(userData.username).toBe('testuser');
      expect(userData.publicKey).toEqual(account.signingKey.publicKey);
      expect(userData.encryptedPrivateKey).toEqual(encryptedPrivateKey);
      expect(userData.metadata).toBeDefined();
      expect(userData.metadata?.encryptedMnemonic).toBeDefined();
      expect(userData.metadata?.mnemonicIV).toBeDefined();
      expect(userData.metadata?.passwordSalt).toBeDefined();
    });
  });

  describe('Login', () => {
    let account: AccountInfo;
    let storedUser: User;

    beforeEach(async () => {
      account = await createAccount('testuser', 'password123');
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );

      storedUser = {
        id: account.userId,
        username: userData.username,
        publicKey: userData.publicKey,
        encryptedPrivateKey: userData.encryptedPrivateKey,
        metadata: userData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should login with correct credentials', async () => {
      const session = await login('testuser', 'password123', storedUser);

      expect(session.userId).toBe(storedUser.id);
      expect(session.username).toBe('testuser');
      expect(session.sessionToken).toBeDefined();
      expect(session.sessionToken.length).toBeGreaterThan(0);
    });

    it('should reject wrong password', async () => {
      await expect(
        login('testuser', 'wrongpassword', storedUser)
      ).rejects.toThrow(/Invalid credentials/);
    });

    it('should reject wrong username', async () => {
      await expect(
        login('wronguser', 'password123', storedUser)
      ).rejects.toThrow(/Invalid credentials/);
    });

    it('should generate unique session tokens', async () => {
      const session1 = await login('testuser', 'password123', storedUser);
      const session2 = await login('testuser', 'password123', storedUser);

      expect(session1.sessionToken).not.toBe(session2.sessionToken);
    });
  });

  describe('Account Recovery', () => {
    it('should recover account from mnemonic', async () => {
      const account = await createAccount('testuser', 'password123');

      const recovered = await recoverAccount(account.mnemonic);

      expect(recovered.publicKey).toBeDefined();
      expect(recovered.privateKey).toBeDefined();
    });

    it('should derive same keys from same mnemonic', async () => {
      const mnemonic =
        'abandon abandon abandon abandon abandon abandon ' +
        'abandon abandon abandon abandon abandon about';

      const recovered1 = await recoverAccount(mnemonic);
      const recovered2 = await recoverAccount(mnemonic);

      expect(recovered1.publicKey).toEqual(recovered2.publicKey);
      expect(recovered1.privateKey).toEqual(recovered2.privateKey);
    });

    it('should reject invalid mnemonic', async () => {
      await expect(
        recoverAccount('invalid mnemonic phrase test')
      ).rejects.toThrow(/Invalid mnemonic/);
    });
  });

  describe('Password Change', () => {
    let account: AccountInfo;
    let storedUser: User;

    beforeEach(async () => {
      account = await createAccount('testuser', 'oldpassword');
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );

      storedUser = {
        id: account.userId,
        username: userData.username,
        publicKey: userData.publicKey,
        encryptedPrivateKey: userData.encryptedPrivateKey,
        metadata: userData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('should change password', async () => {
      const result = await changePassword(
        'oldpassword',
        'newpassword',
        storedUser
      );

      expect(result.encryptedMnemonic).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.salt).not.toEqual(account.salt);
    });

    it('should reject wrong old password', async () => {
      await expect(
        changePassword('wrongpassword', 'newpassword', storedUser)
      ).rejects.toThrow();
    });

    it('should allow login with new password after change', async () => {
      const result = await changePassword(
        'oldpassword',
        'newpassword',
        storedUser
      );

      // Update stored user with new encrypted mnemonic
      const updatedUser: User = {
        ...storedUser,
        metadata: {
          ...storedUser.metadata,
          encryptedMnemonic: Buffer.from(
            result.encryptedMnemonic.ciphertext
          ).toString('base64'),
          mnemonicIV: Buffer.from(result.encryptedMnemonic.iv).toString(
            'base64'
          ),
          passwordSalt: Buffer.from(result.salt).toString('base64'),
        },
      };

      const session = await login('testuser', 'newpassword', updatedUser);
      expect(session.sessionToken).toBeDefined();
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full signup → login flow', async () => {
      // 1. Create account
      const account = await createAccount('alice', 'secure-password');
      expect(account.mnemonic).toBeDefined();

      // 2. Store user data
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );
      const storedUser: User = {
        id: account.userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Login
      const session = await login('alice', 'secure-password', storedUser);
      expect(session.userId).toBe(account.userId);

      // 4. Verify session
      expect(session.sessionToken).toBeTruthy();
    });

    it('should complete account recovery flow', async () => {
      // 1. Create account
      const account = await createAccount('bob', 'password');
      const originalMnemonic = account.mnemonic;

      // 2. Lose access, recover with mnemonic
      const recovered = await recoverAccount(originalMnemonic);

      // 3. Verify keys can be derived
      expect(recovered.publicKey).toBeDefined();
      expect(recovered.privateKey).toBeDefined();
    });
  });
});
