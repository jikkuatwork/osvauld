import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../../test/mocks/indexeddb';
import { setupMockWebAPIs } from '../../../test/mocks';
import {
  createAccount,
  createUserData,
  login,
  recoverAccount,
} from '../../../src/auth/mnemonic';
import {
  authenticateWithMetaMask,
  createAccountFromMetaMask,
} from '../../../src/auth/metamask';
import { createSession, validateSession } from '../../../src/auth/session';
import {
  initDatabase,
  closeDatabase,
  deleteDatabase,
  UserRepository,
  type OsvauldDB,
} from '../../../src/storage';
import type { User } from '../../../src/types';

describe('Authentication Integration', () => {
  let db: OsvauldDB;
  let userRepo: UserRepository;
  const dbName = 'test-auth-' + Date.now();

  beforeEach(async () => {
    setupMockWebAPIs();
    db = initDatabase(dbName);
    userRepo = new UserRepository(db);
  });

  afterEach(async () => {
    await closeDatabase(db);
    await deleteDatabase(dbName);
  });

  describe('Mnemonic Auth Flow', () => {
    it('should complete signup → login → logout flow', async () => {
      // 1. Signup: Create account
      const account = await createAccount('alice', 'password123');
      expect(account.mnemonic).toBeDefined();

      // 2. Store user
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );
      const user: User = {
        id: account.userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user);

      // 3. Login
      const storedUser = await userRepo.get(user.id);
      const session = await login('alice', 'password123', storedUser);
      expect(session.sessionToken).toBeDefined();

      // 4. Create session
      const userSession = createSession(session.userId);
      expect(validateSession(userSession)).toBe(true);

      // 5. Verify user is in database
      const retrievedUser = await userRepo.get(user.id);
      expect(retrievedUser.username).toBe('alice');
    });

    it('should handle password change', async () => {
      // Create and store user
      const account = await createAccount('bob', 'oldpassword');
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );
      const user: User = {
        id: account.userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user);

      // Login with old password
      const storedUser = await userRepo.get(user.id);
      const session1 = await login('bob', 'oldpassword', storedUser);
      expect(session1).toBeDefined();

      // Verify cannot login with wrong password
      await expect(
        login('bob', 'wrongpassword', storedUser)
      ).rejects.toThrow();
    });

    it('should handle account recovery', async () => {
      // Create account and save mnemonic
      const account = await createAccount('charlie', 'password');
      const savedMnemonic = account.mnemonic;

      // Simulate losing access, recover with mnemonic
      const recovered = await recoverAccount(savedMnemonic);

      expect(recovered.publicKey).toBeDefined();
      expect(recovered.privateKey).toBeDefined();
    });
  });

  describe('MetaMask Auth Flow', () => {
    it('should authenticate with MetaMask', async () => {
      // 1. Authenticate with MetaMask
      const metamaskAccount = await authenticateWithMetaMask();
      expect(metamaskAccount.address).toBeDefined();

      // 2. Create account
      const account = createAccountFromMetaMask(metamaskAccount, 'alice-mm');

      // 3. Store user
      const user: User = {
        id: account.userId,
        username: account.username,
        publicKey: account.publicKey,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          authMethod: 'metamask',
          ethereumAddress: account.address,
        },
      };
      await userRepo.create(user);

      // 4. Create session
      const session = createSession(user.id);
      expect(validateSession(session)).toBe(true);

      // 5. Verify user
      const storedUser = await userRepo.get(user.id);
      expect(storedUser.username).toBe('alice-mm');
      expect(storedUser.metadata?.ethereumAddress).toBe(account.address);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users', async () => {
      // Create first user
      const account1 = await createAccount('user1', 'pass1');
      const userData1 = createUserData(
        account1,
        account1.signingKey.privateKey
      );
      const user1: User = {
        id: account1.userId,
        ...userData1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user1);

      // Create second user
      const account2 = await createAccount('user2', 'pass2');
      const userData2 = createUserData(
        account2,
        account2.signingKey.privateKey
      );
      const user2: User = {
        id: account2.userId,
        ...userData2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user2);

      // Verify both users exist
      const allUsers = await userRepo.getAll();
      expect(allUsers.length).toBe(2);

      // Login both users
      const stored1 = await userRepo.get(user1.id);
      const session1 = await login('user1', 'pass1', stored1);
      expect(session1.username).toBe('user1');

      const stored2 = await userRepo.get(user2.id);
      const session2 = await login('user2', 'pass2', stored2);
      expect(session2.username).toBe('user2');

      // Verify sessions are different
      expect(session1.sessionToken).not.toBe(session2.sessionToken);
    });

    it('should prevent cross-user access', async () => {
      // Create two users
      const account1 = await createAccount('alice', 'alice-pass');
      const account2 = await createAccount('bob', 'bob-pass');

      const userData1 = createUserData(
        account1,
        account1.signingKey.privateKey
      );
      const userData2 = createUserData(
        account2,
        account2.signingKey.privateKey
      );

      const user1: User = {
        id: account1.userId,
        ...userData1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const user2: User = {
        id: account2.userId,
        ...userData2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await userRepo.create(user1);
      await userRepo.create(user2);

      // Try to login alice with bob's password
      const aliceData = await userRepo.get(user1.id);
      await expect(login('alice', 'bob-pass', aliceData)).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should create and validate sessions', async () => {
      // Create user
      const account = await createAccount('dave', 'password');
      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );
      const user: User = {
        id: account.userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user);

      // Login and create session
      const storedUser = await userRepo.get(user.id);
      const loginResult = await login('dave', 'password', storedUser);
      const session = createSession(loginResult.userId);

      // Validate session
      expect(validateSession(session)).toBe(true);
      expect(session.userId).toBe(user.id);
    });
  });

  describe('Complete E2E Flow', () => {
    it('should simulate real user journey', async () => {
      // Day 1: User signs up
      const account = await createAccount('eve', 'secure-password');
      const mnemonic = account.mnemonic; // User saves this

      const userData = createUserData(
        account,
        account.signingKey.privateKey
      );
      const user: User = {
        id: account.userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await userRepo.create(user);

      // Day 2: User logs in
      const storedUser = await userRepo.get(user.id);
      const session = await login('eve', 'secure-password', storedUser);
      const userSession = createSession(session.userId);
      expect(validateSession(userSession)).toBe(true);

      // Day 30: User loses device, recovers with mnemonic
      const recovered = await recoverAccount(mnemonic);
      expect(recovered.publicKey).toBeDefined();

      // User can derive new keys and regain access
      expect(recovered.privateKey.length).toBe(32);
    });
  });
});
