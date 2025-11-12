/**
 * Authentication Manager
 *
 * Unified authentication interface supporting multiple auth methods.
 */

import { createAccount, login as mnemonicLogin, createUserData, type AccountInfo } from './mnemonic';
import type { UserRepository } from '../storage/repositories/user';
import type { User } from '../types/user';
import { generateKey, encrypt, importKey, decrypt } from '../crypto/aes';
import { deriveKey } from '../crypto/argon2';

export interface AuthSession {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface AuthResult {
  user: User;
  session: AuthSession;
}

export interface RegisterOptions {
  email?: string;
  name?: string;
}

/**
 * Authentication manager
 */
export class AuthenticationManager {
  constructor(private userRepo: UserRepository) {}

  /**
   * Registers a new user with password
   */
  async register(
    username: string,
    password: string,
    options: RegisterOptions = {}
  ): Promise<AuthResult> {
    // Check if user exists
    const existingUsers = await this.userRepo.list();
    if (existingUsers.some((u) => u.username === username)) {
      throw new Error('Username already exists');
    }

    // Create account using mnemonic auth
    const account: AccountInfo = await createAccount(username, password);

    // Encrypt private key for storage
    const passwordKey = deriveKey(password, account.salt, {
      memoryCost: 1024,
      timeCost: 1,
      parallelism: 1,
    });
    const aesKey = await importKey(passwordKey);
    const encryptedPrivateKey = await encrypt(
      account.signingKey.privateKey,
      aesKey
    );

    // Create user data
    const userData = createUserData(account, encryptedPrivateKey.ciphertext);

    // Create user record
    const user: User = {
      id: account.userId,
      username: account.username,
      email: options.email,
      publicKey: account.signingKey.publicKey,
      encryptedPrivateKey: encryptedPrivateKey.ciphertext,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        encryptedMnemonic: Buffer.from(account.encryptedMnemonic.ciphertext).toString('base64'),
        mnemonicIV: Buffer.from(account.encryptedMnemonic.iv).toString('base64'),
        passwordSalt: Buffer.from(account.salt).toString('base64'),
        privateKeyIV: Buffer.from(encryptedPrivateKey.iv).toString('base64'),
      },
    };

    await this.userRepo.create(user);

    return {
      user,
      session: {
        privateKey: account.signingKey.privateKey,
        publicKey: account.signingKey.publicKey,
      },
    };
  }

  /**
   * Logs in a user with password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    // Find user
    const users = await this.userRepo.list();
    const user = users.find((u) => u.username === username);

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Use mnemonic login
    const session = await mnemonicLogin(username, password, user);

    // Decrypt private key
    const metadata = user.metadata as {
      passwordSalt: string;
      privateKeyIV: string;
    };

    const salt = Uint8Array.from(Buffer.from(metadata.passwordSalt, 'base64'));
    const passwordKey = deriveKey(password, salt, {
      memoryCost: 1024,
      timeCost: 1,
      parallelism: 1,
    });

    const aesKey = await importKey(passwordKey);
    const encryptedPrivateKey = {
      ciphertext: user.encryptedPrivateKey || new Uint8Array(32),
      iv: Uint8Array.from(Buffer.from(metadata.privateKeyIV, 'base64')),
    };

    const privateKeyBuffer = await decrypt(encryptedPrivateKey, aesKey);

    return {
      user,
      session: {
        privateKey: new Uint8Array(privateKeyBuffer),
        publicKey: user.publicKey,
      },
    };
  }

  /**
   * Gets a user by ID
   */
  async getUser(userId: string): Promise<User> {
    return await this.userRepo.get(userId);
  }

  /**
   * Updates user profile
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = await this.userRepo.get(userId);

    const updated: User = {
      ...user,
      ...updates,
      id: user.id, // Prevent ID change
      createdAt: user.createdAt, // Prevent createdAt change
      updatedAt: new Date(),
    };

    return await this.userRepo.update(userId, updated);
  }
}

/**
 * Creates an authentication manager
 */
export function createAuthenticationManager(userRepo: UserRepository): AuthenticationManager {
  return new AuthenticationManager(userRepo);
}
