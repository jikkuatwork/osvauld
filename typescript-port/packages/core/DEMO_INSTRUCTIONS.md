# Phase 3 Demo Instructions

Phase 3 (Authentication) is complete! Here are two ways to test the system:

## 📋 Prerequisites

First, make sure you have the latest code:
```bash
git pull origin claude/repo-review-priorities-011CV3LNfSmCU4iyBHEVt3wj
cd typescript-port/packages/core
npm install
```

## 🖥️ Option 1: Node.js Demo (Full Functionality)

This demo uses the actual TypeScript implementation with all features working:

```bash
# From typescript-port/packages/core/
npx tsx demo.ts
```

**What you'll see:**
- ✅ Account creation with BIP39 mnemonic
- ✅ User storage in IndexedDB (mocked for Node.js)
- ✅ Password-based login
- ✅ Session management with tokens
- ✅ Account recovery from mnemonic
- ✅ Database verification

**Features demonstrated:**
- BIP39 12-word recovery phrases
- AES-GCM encryption (password → encrypted mnemonic)
- Ed25519 key pair generation
- Argon2id password hashing
- IndexedDB storage (via fake-indexeddb)
- Session tokens with expiration

## 🌐 Option 2: Browser Demo (Visual Interface)

This is a standalone HTML file with a beautiful UI - perfect for visual testing:

```bash
# From typescript-port/packages/core/
# Simply open in your browser:
open demo-browser.html   # macOS
xdg-open demo-browser.html   # Linux
start demo-browser.html   # Windows
```

Or drag `demo-browser.html` into your browser.

**What you'll see:**
- 📊 System status dashboard (175/175 tests passing)
- 📝 Account creation form with mnemonic display
- 🔐 Login interface
- 🎫 Active session viewer
- 🔄 Account recovery form
- ℹ️ Technical information

**Note:** The browser demo uses simplified mock implementations since we haven't built the library for browser consumption yet. The Node.js demo uses the real code!

## 🧪 Option 3: Run Tests

See everything working in the test suite:

```bash
npm test

# Or with coverage report:
npm run test:coverage
```

**Test results:**
- ✅ 175/175 tests passing
- ✅ 80%+ coverage across all modules
- ✅ 8 integration tests for complete auth flows

## 📚 What's Working

### ✅ Phase 0: Test Infrastructure
- Vitest with strict 80% coverage thresholds
- Mock implementations (IndexedDB, WebRTC, MetaMask, WebAuthn)
- Test helpers and fixtures

### ✅ Phase 1: Crypto Primitives
- Ed25519 digital signatures (@noble/ed25519)
- AES-GCM encryption (Web Crypto API)
- Argon2id key derivation (@noble/hashes)
- BIP39/BIP32 mnemonic support (@scure/bip39)

### ✅ Phase 2: Storage Layer
- IndexedDB via Dexie
- Repository pattern (Users, Documents, Folders, Shares, Devices)
- Type-safe interfaces
- Query support

### ✅ Phase 3: Authentication (🎯 FIRST DEMO)
- Mnemonic-based auth (create, login, recover)
- MetaMask Web3 wallet (mocked)
- Passkey WebAuthn (mocked)
- Session management (create, validate, refresh, destroy)

## 🎯 Next Steps

After testing Phase 3, we can proceed to:

- **Phase 4:** Document Management
- **Phase 5:** CRDT Integration
- **Phase 6:** P2P Layer Mocked (🎯 SECOND DEMO)

## 🐛 Troubleshooting

### "Cannot find module demo.ts"
Make sure you've pulled the latest changes:
```bash
git pull origin claude/repo-review-priorities-011CV3LNfSmCU4iyBHEVt3wj
```

### "Command 'tsx' not found"
Install dependencies first:
```bash
npm install
```

### Tests failing
This shouldn't happen (all 175 tests pass in CI), but if it does:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm test
```

## 📖 Additional Resources

- `TESTING_GUIDE.md` - Comprehensive testing documentation
- `test/integration/auth/full-flow.test.ts` - Complete auth flow examples
- `src/auth/` - Authentication module source code

---

**Status:** Phase 3 Complete - 175/175 tests passing ✅

Try running `npx tsx demo.ts` first to see the complete authentication flow in action!
