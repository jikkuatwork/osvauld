/**
 * Demo: Complete Authentication Flow
 *
 * This example shows how to use the authentication system:
 * 1. Create a new account with mnemonic
 * 2. Store user in database
 * 3. Login with password
 * 4. Recover from mnemonic
 */

// Import fake-indexeddb for Node.js environment
import 'fake-indexeddb/auto';

import { createAccount, login, recoverAccount } from './src/auth/mnemonic';
import { createUserData } from './src/auth/mnemonic';
import { createSession, validateSession } from './src/auth/session';
import { initDatabase, closeDatabase, UserRepository } from './src/storage';
import type { User } from './src/types';

async function demoAuthFlow() {
  console.log('🚀 Osvauld Authentication Demo\n');

  // Initialize database
  const db = initDatabase('demo-db');
  const userRepo = new UserRepository(db);

  try {
    // ═══════════════════════════════════════════════════════
    // Step 1: Create Account
    // ═══════════════════════════════════════════════════════
    console.log('📝 Step 1: Creating account...');
    const account = await createAccount('alice', 'secure-password-123');

    console.log('✅ Account created!');
    console.log('   User ID:', account.userId);
    console.log('   Username:', account.username);
    console.log('   Mnemonic:', account.mnemonic);
    console.log('   ⚠️  SAVE THE MNEMONIC! It\'s needed for recovery.\n');

    // ═══════════════════════════════════════════════════════
    // Step 2: Store User in Database
    // ═══════════════════════════════════════════════════════
    console.log('💾 Step 2: Storing user in database...');
    const userData = createUserData(account, account.signingKey.privateKey);
    const user: User = {
      id: account.userId,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await userRepo.create(user);
    console.log('✅ User stored successfully!\n');

    // ═══════════════════════════════════════════════════════
    // Step 3: Login
    // ═══════════════════════════════════════════════════════
    console.log('🔐 Step 3: Logging in...');
    const storedUser = await userRepo.get(user.id);
    const loginSession = await login('alice', 'secure-password-123', storedUser);

    console.log('✅ Login successful!');
    console.log('   Session Token:', loginSession.sessionToken.slice(0, 16) + '...');

    // Create session
    const session = createSession(loginSession.userId);
    console.log('   Session Valid:', validateSession(session));
    console.log('   Expires:', session.expiresAt.toLocaleString());
    console.log();

    // ═══════════════════════════════════════════════════════
    // Step 4: Simulate Account Recovery
    // ═══════════════════════════════════════════════════════
    console.log('🔄 Step 4: Recovering account from mnemonic...');
    const savedMnemonic = account.mnemonic; // User saved this during signup
    const recovered = await recoverAccount(savedMnemonic);

    console.log('✅ Account recovered!');
    console.log('   Public Key:', Buffer.from(recovered.publicKey).toString('hex').slice(0, 32) + '...');
    console.log('   Private Key:', Buffer.from(recovered.privateKey).toString('hex').slice(0, 32) + '...');
    console.log();

    // ═══════════════════════════════════════════════════════
    // Step 5: Verify All Users in Database
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 5: Database verification...');
    const allUsers = await userRepo.getAll();
    console.log('✅ Total users in database:', allUsers.length);
    allUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.username} (${u.id})`);
    });
    console.log();

    // ═══════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════
    console.log('🎉 Demo Complete!');
    console.log('─'.repeat(50));
    console.log('✓ Account creation with mnemonic');
    console.log('✓ Encrypted storage in IndexedDB');
    console.log('✓ Password-based login');
    console.log('✓ Session management');
    console.log('✓ Account recovery from mnemonic');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    await closeDatabase(db);
  }
}

// Run the demo
demoAuthFlow().catch(console.error);
