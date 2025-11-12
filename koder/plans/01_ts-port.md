# TypeScript Port Implementation Plan

**Project**: Osvauld TypeScript Port
**Location**: `typescript-port/`
**Approach**: Sandbox-first, mock external APIs, test everything
**Target**: Prove TypeScript can replace Rust implementation

---

## Implementation Strategy

### Sandbox-First Principle

- Build everything testable without external APIs first
- Mock all network/external dependencies
- Push real network integration to final phases
- Each phase is independently testable in sandbox

### Phase Structure

- Each phase has granular todos (checkboxes)
- Commit after completing each phase
- Test suite runs in sandbox (no network required)
- External APIs are mocked until final integration phases

### Testing Philosophy

- Test infrastructure setup FIRST
- Every function has tests BEFORE moving forward
- Mock external dependencies (WebRTC, network, etc)
- Integration tests use local-only setup
- Real network tests only in final phases

---

## Phase 0: Test Infrastructure Setup

**Goal**: Setup complete testing environment in sandbox
**Time**: 2-3 hours
**Dependencies**: None

### Phase 0.1: Project Initialization

- [ ] Create `typescript-port/packages/core/` directory
- [ ] Initialize npm package (`package.json`)
- [ ] Install TypeScript (`typescript@^5.3.0`)
- [ ] Install Vitest (`vitest@^1.0.0`)
- [ ] Install test utilities (`@vitest/ui`)
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `vitest.config.ts`
- [ ] Verify `pnpm test` runs (even with no tests)
- [ ] Create `.gitignore` for `node_modules/`, `dist/`

### Phase 0.2: Test Helpers & Mocks

- [ ] Create `test/setup.ts` for global test config
- [ ] Create `test/helpers/` directory
- [ ] Create `test/mocks/` directory for mock implementations
- [ ] Add test helper: `generateRandomBytes()`
- [ ] Add test helper: `waitFor()` for async tests
- [ ] Add test helper: `mockStorage()` for storage tests
- [ ] Create mock for IndexedDB (`test/mocks/indexeddb.ts`)
- [ ] Create mock for WebRTC (`test/mocks/webrtc.ts`)
- [ ] Create mock for crypto.subtle if needed
- [ ] Verify all mocks work with simple tests

### Phase 0.3: Test Suite Structure

- [ ] Create `test/unit/` directory
- [ ] Create `test/integration/` directory
- [ ] Create `test/fixtures/` for test data
- [ ] Add test fixture: sample user data
- [ ] Add test fixture: sample document data
- [ ] Add test fixture: sample encryption keys
- [ ] Create `test/README.md` documenting test structure
- [ ] Add npm script: `test:unit`
- [ ] Add npm script: `test:integration`
- [ ] Add npm script: `test:watch`

### Phase 0.4: Coverage & Quality

- [ ] Configure coverage with Vitest (`@vitest/coverage-v8`)
- [ ] Set coverage thresholds (80% minimum)
- [ ] Add ESLint (`eslint@^9.0.0`)
- [ ] Add Prettier (`prettier@^3.0.0`)
- [ ] Create `.eslintrc.json` with strict rules
- [ ] Create `.prettierrc.json` with 80 char width
- [ ] Add npm script: `lint`
- [ ] Add npm script: `format`
- [ ] Add pre-commit hook setup (optional)
- [ ] Verify all quality tools work

**Commit**: "Phase 0: Test infrastructure complete"

---

## Phase 1: Crypto Primitives (Pure Sandbox)

**Goal**: All cryptographic operations working in sandbox
**Time**: 6-8 hours
**Dependencies**: Phase 0
**Network**: None required (pure math)

### Phase 1.1: Ed25519 Key Operations

- [ ] Install `@noble/ed25519@^2.0.0`
- [ ] Create `src/crypto/ed25519.ts`
- [ ] Implement `generateKeyPair(): KeyPair`
- [ ] Implement `sign(message, privateKey): Signature`
- [ ] Implement `verify(signature, message, publicKey): boolean`
- [ ] Create `test/unit/crypto/ed25519.test.ts`
- [ ] Test: can generate keypair
- [ ] Test: signatures are deterministic
- [ ] Test: valid signatures verify
- [ ] Test: invalid signatures fail
- [ ] Test: different messages = different signatures
- [ ] Benchmark vs Rust (document in test output)
- [ ] Test: handles large messages (>1MB)
- [ ] Test: handles empty messages
- [ ] All tests pass ✓

### Phase 1.2: AES-GCM Encryption

- [ ] Create `src/crypto/aes.ts`
- [ ] Implement `generateKey(): CryptoKey`
- [ ] Implement `encrypt(data, key): EncryptedData`
- [ ] Implement `decrypt(encrypted, key): string`
- [ ] Implement `exportKey(key): string` (for storage)
- [ ] Implement `importKey(exported): CryptoKey`
- [ ] Create `test/unit/crypto/aes.test.ts`
- [ ] Test: can generate key
- [ ] Test: encrypt/decrypt roundtrip works
- [ ] Test: IV is random (different per encryption)
- [ ] Test: wrong key fails decryption
- [ ] Test: tampered ciphertext fails (auth tag)
- [ ] Test: can export/import keys
- [ ] Test: handles large data (>10MB)
- [ ] Test: handles Unicode correctly
- [ ] Benchmark vs Rust
- [ ] All tests pass ✓

### Phase 1.3: Argon2 Key Derivation

- [ ] Install `@noble/hashes@^1.3.0`
- [ ] Create `src/crypto/argon2.ts`
- [ ] Implement `deriveKey(password, salt, params): Key`
- [ ] Implement `generateSalt(): Uint8Array`
- [ ] Define default params (memory: 64MB, iterations: 3)
- [ ] Create `test/unit/crypto/argon2.test.ts`
- [ ] Test: same password+salt = same key
- [ ] Test: different password = different key
- [ ] Test: different salt = different key
- [ ] Test: key derivation is slow (~100ms expected)
- [ ] Test: output is 32 bytes
- [ ] Test: can customize params
- [ ] Benchmark vs Rust
- [ ] All tests pass ✓

### Phase 1.4: BIP39 Mnemonic

- [ ] Install `@scure/bip39@^1.2.0`
- [ ] Install `@scure/bip32@^1.3.0` (for key derivation)
- [ ] Create `src/crypto/mnemonic.ts`
- [ ] Implement `generateMnemonic(strength?): string`
- [ ] Implement `validateMnemonic(mnemonic): boolean`
- [ ] Implement `mnemonicToSeed(mnemonic): Uint8Array`
- [ ] Implement `deriveKeyPair(seed, path): KeyPair`
- [ ] Create `test/unit/crypto/mnemonic.test.ts`
- [ ] Test: generates valid 12-word mnemonic
- [ ] Test: generates valid 24-word mnemonic
- [ ] Test: same mnemonic = same seed
- [ ] Test: can validate valid mnemonics
- [ ] Test: rejects invalid mnemonics
- [ ] Test: can derive multiple keys from seed
- [ ] Test: derivation paths work (m/44'/0'/0'/0/0)
- [ ] Test: mnemonic → seed → keys → recovery works
- [ ] All tests pass ✓

### Phase 1.5: Crypto Integration

- [ ] Create `src/crypto/index.ts` (main export)
- [ ] Create `test/integration/crypto/full-flow.test.ts`
- [ ] Test: complete encryption flow (mnemonic → encrypt)
- [ ] Test: complete decryption flow (mnemonic → decrypt)
- [ ] Test: key recovery from mnemonic works
- [ ] Test: can encrypt with one key, decrypt with derived
- [ ] Test: cross-function integration (all crypto together)
- [ ] Document crypto API in `src/crypto/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 1: Crypto primitives complete"

---

## Phase 2: Storage Layer (Mocked in Sandbox)

**Goal**: Storage operations working with mocked IndexedDB
**Time**: 4-6 hours
**Dependencies**: Phase 1
**Network**: None (all local/mocked)

### Phase 2.1: Type Definitions

- [ ] Create `src/types/` directory
- [ ] Create `src/types/user.ts` with User interface
- [ ] Create `src/types/document.ts` with Document interface
- [ ] Create `src/types/folder.ts` with Folder interface
- [ ] Create `src/types/share.ts` with ShareRecord interface
- [ ] Create `src/types/device.ts` with Device interface
- [ ] Create `src/types/index.ts` (main export)
- [ ] All types match Rust domain models
- [ ] Add JSDoc comments to all types
- [ ] Type definitions are strict (no `any`)

### Phase 2.2: Storage Interface

- [ ] Create `src/storage/interface.ts`
- [ ] Define `IStorage` interface (abstract operations)
- [ ] Define methods: `get`, `set`, `delete`, `query`
- [ ] Define transaction support
- [ ] Create `src/storage/errors.ts` for storage errors
- [ ] Document storage interface in comments

### Phase 2.3: IndexedDB Implementation (Mocked)

- [ ] Install `dexie@^3.2.0`
- [ ] Install `fake-indexeddb@^5.0.0` (for testing)
- [ ] Create `src/storage/indexeddb.ts`
- [ ] Implement Dexie schema for all tables
- [ ] Implement `IndexedDBStorage` class
- [ ] Create `test/unit/storage/indexeddb.test.ts`
- [ ] Use `fake-indexeddb` in tests (sandbox!)
- [ ] Test: can initialize database
- [ ] Test: can create records
- [ ] Test: can read records
- [ ] Test: can update records
- [ ] Test: can delete records
- [ ] Test: can query with filters
- [ ] Test: transactions work (commit/rollback)
- [ ] Test: indexes work for queries
- [ ] All tests pass with mocked IndexedDB ✓

### Phase 2.4: Repository Pattern

- [ ] Create `src/storage/repositories/` directory
- [ ] Create `UserRepository` class
- [ ] Create `DocumentRepository` class
- [ ] Create `FolderRepository` class
- [ ] Create `ShareRepository` class
- [ ] Create `test/unit/storage/repositories/` tests
- [ ] Test: UserRepository CRUD operations
- [ ] Test: DocumentRepository CRUD operations
- [ ] Test: FolderRepository CRUD operations
- [ ] Test: relationships work (user → documents)
- [ ] Test: cascading deletes (if needed)
- [ ] All repository tests pass ✓

**Commit**: "Phase 2: Storage layer complete (mocked)"

---

## Phase 3: Authentication (Pure Sandbox)

**Goal**: Complete auth system working locally
**Time**: 4-5 hours
**Dependencies**: Phase 1, Phase 2
**Network**: None (all local operations)

### Phase 3.1: Mnemonic Authentication

- [ ] Create `src/auth/mnemonic.ts`
- [ ] Implement `createAccount(username): AccountInfo`
- [ ] Implement `storeAccount(account, password): void`
- [ ] Implement `login(username, password): Session`
- [ ] Implement `recoverFromMnemonic(mnemonic): KeyPair`
- [ ] Create `test/unit/auth/mnemonic.test.ts`
- [ ] Test: can create account with mnemonic
- [ ] Test: mnemonic is returned to user
- [ ] Test: keys are derived correctly
- [ ] Test: can store encrypted account
- [ ] Test: can login with password
- [ ] Test: can recover from mnemonic
- [ ] Test: wrong password fails login
- [ ] Test: invalid mnemonic fails recovery
- [ ] All tests pass ✓

### Phase 3.2: MetaMask Auth (Mocked)

- [ ] Create `src/auth/metamask.ts`
- [ ] Create mock for `window.ethereum`
- [ ] Implement `connectMetaMask(): Address`
- [ ] Implement `signChallenge(challenge): Signature`
- [ ] Implement `verifySignature(signature, challenge): boolean`
- [ ] Implement `deriveEncryptionKey(signature): Key`
- [ ] Create `test/unit/auth/metamask.test.ts`
- [ ] Test: can connect to MetaMask (mocked)
- [ ] Test: can sign challenges
- [ ] Test: can verify signatures
- [ ] Test: can derive encryption keys
- [ ] Test: different signatures = different keys
- [ ] All tests pass with mocked MetaMask ✓

### Phase 3.3: Passkey Auth (Mocked)

- [ ] Create `src/auth/passkey.ts`
- [ ] Create mock for `navigator.credentials`
- [ ] Implement `registerPasskey(username): Credential`
- [ ] Implement `authenticateWithPasskey(): Credential`
- [ ] Implement `verifyPasskeyAssertion(assertion): boolean`
- [ ] Create `test/unit/auth/passkey.test.ts`
- [ ] Test: can register passkey (mocked)
- [ ] Test: can authenticate with passkey (mocked)
- [ ] Test: assertions are valid
- [ ] Test: can store credential info
- [ ] All tests pass with mocked WebAuthn ✓

### Phase 3.4: Session Management

- [ ] Create `src/auth/session.ts`
- [ ] Implement `createSession(user): Session`
- [ ] Implement `validateSession(sessionId): boolean`
- [ ] Implement `refreshSession(sessionId): Session`
- [ ] Implement `destroySession(sessionId): void`
- [ ] Create `test/unit/auth/session.test.ts`
- [ ] Test: can create sessions
- [ ] Test: sessions have expiry
- [ ] Test: can validate active sessions
- [ ] Test: expired sessions fail validation
- [ ] Test: can refresh sessions
- [ ] Test: destroyed sessions are invalid
- [ ] All tests pass ✓

### Phase 3.5: Auth Integration

- [ ] Create `src/auth/index.ts` (unified auth)
- [ ] Implement `AuthManager` class
- [ ] Support multiple auth methods
- [ ] Create `test/integration/auth/full-flow.test.ts`
- [ ] Test: signup → login → logout flow (mnemonic)
- [ ] Test: signup → login flow (MetaMask)
- [ ] Test: signup → login flow (Passkey)
- [ ] Test: can switch auth methods
- [ ] Test: mnemonic recovery works end-to-end
- [ ] Document auth API in `src/auth/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 3: Authentication complete (sandbox)"

**🎯 FIRST DEMO POINT** - Can show auth working!

---

## Phase 4: Document Management (Pure Sandbox)

**Goal**: Encrypted documents working locally
**Time**: 5-6 hours
**Dependencies**: Phase 1, Phase 2, Phase 3
**Network**: None (all local)

### Phase 4.1: Document Encryption

- [ ] Create `src/documents/encryption.ts`
- [ ] Implement `encryptDocument(content, key): EncryptedDoc`
- [ ] Implement `decryptDocument(encrypted, key): Content`
- [ ] Implement `encryptKeyForUser(key, publicKey): EncryptedKey`
- [ ] Implement `decryptKeyForUser(encKey, privKey): Key`
- [ ] Create `test/unit/documents/encryption.test.ts`
- [ ] Test: can encrypt documents
- [ ] Test: can decrypt documents
- [ ] Test: encrypt → decrypt roundtrip
- [ ] Test: can share keys between users
- [ ] Test: wrong key fails decryption
- [ ] Test: handles large documents (>10MB)
- [ ] All tests pass ✓

### Phase 4.2: Document CRUD

- [ ] Create `src/documents/manager.ts`
- [ ] Implement `createDocument(title, content): Document`
- [ ] Implement `getDocument(id, userId): Document`
- [ ] Implement `updateDocument(id, content): Document`
- [ ] Implement `deleteDocument(id): void`
- [ ] Implement `listDocuments(userId): Document[]`
- [ ] Create `test/unit/documents/manager.test.ts`
- [ ] Test: can create encrypted documents
- [ ] Test: can retrieve and decrypt documents
- [ ] Test: can update documents (re-encrypt)
- [ ] Test: can delete documents
- [ ] Test: can list user's documents
- [ ] Test: user can't access others' documents
- [ ] All tests pass ✓

### Phase 4.3: Folder Organization

- [ ] Create `src/documents/folders.ts`
- [ ] Implement `createFolder(name, parentId?): Folder`
- [ ] Implement `getFolder(id): Folder`
- [ ] Implement `listFolders(userId): Folder[]`
- [ ] Implement `moveDocument(docId, folderId): void`
- [ ] Implement `getFolderDocuments(folderId): Document[]`
- [ ] Create `test/unit/documents/folders.test.ts`
- [ ] Test: can create folders
- [ ] Test: can nest folders (parent/child)
- [ ] Test: can move documents to folders
- [ ] Test: can list documents in folder
- [ ] Test: can delete folder (cascade or not)
- [ ] All tests pass ✓

### Phase 4.4: Document Metadata

- [ ] Create `src/documents/metadata.ts`
- [ ] Implement `toggleFavorite(docId): void`
- [ ] Implement `updateLastAccessed(docId): void`
- [ ] Implement `addTags(docId, tags): void`
- [ ] Implement `removeTags(docId, tags): void`
- [ ] Implement `queryByTags(tags): Document[]`
- [ ] Create `test/unit/documents/metadata.test.ts`
- [ ] Test: favorites system works
- [ ] Test: last accessed tracking works
- [ ] Test: can add/remove tags
- [ ] Test: can query by tags
- [ ] All tests pass ✓

### Phase 4.5: Document Integration

- [ ] Create `test/integration/documents/full-flow.test.ts`
- [ ] Test: create → encrypt → store → retrieve → decrypt
- [ ] Test: share document key with another user
- [ ] Test: second user can decrypt document
- [ ] Test: organize documents in folders
- [ ] Test: query documents by various criteria
- [ ] Document document API in `src/documents/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 4: Document management complete"

---

## Phase 5: CRDT Integration (Local Sandbox)

**Goal**: Collaborative editing working with local peers
**Time**: 5-6 hours
**Dependencies**: Phase 4
**Network**: None (local Yjs instances)

### Phase 5.1: Yjs Setup

- [ ] Install `yjs@^13.6.0`
- [ ] Install `y-prosemirror@^1.2.0`
- [ ] Create `src/crdt/ydoc.ts`
- [ ] Implement `createYDoc(docId): Y.Doc`
- [ ] Implement `getYText(ydoc, field): Y.Text`
- [ ] Implement `subscribeToUpdates(ydoc, callback): Unsubscribe`
- [ ] Create `test/unit/crdt/ydoc.test.ts`
- [ ] Test: can create Y.Doc
- [ ] Test: can insert text
- [ ] Test: can delete text
- [ ] Test: can get current text
- [ ] Test: updates trigger callbacks
- [ ] All tests pass ✓

### Phase 5.2: CRDT Sync (Local)

- [ ] Create `src/crdt/sync.ts`
- [ ] Implement `encodeUpdate(update): Uint8Array`
- [ ] Implement `decodeUpdate(encoded): Update`
- [ ] Implement `applyUpdate(ydoc, update): void`
- [ ] Implement `getStateVector(ydoc): StateVector`
- [ ] Implement `getMissingUpdates(ydoc, vector): Updates`
- [ ] Create `test/unit/crdt/sync.test.ts`
- [ ] Test: can encode/decode updates
- [ ] Test: can apply updates
- [ ] Test: concurrent edits merge correctly
- [ ] Test: two Y.Docs sync via updates (local!)
- [ ] Test: conflicts resolve automatically
- [ ] Test: state vectors work for diff sync
- [ ] All tests pass ✓

### Phase 5.3: ProseMirror Binding

- [ ] Create `src/crdt/prosemirror.ts`
- [ ] Implement `bindProseMirror(ydoc, schema): Plugin`
- [ ] Implement `ySyncPlugin(ytext): Plugin`
- [ ] Implement `yCursorPlugin(): Plugin`
- [ ] Create `test/unit/crdt/prosemirror.test.ts`
- [ ] Test: can bind Y.Text to ProseMirror
- [ ] Test: ProseMirror edits update Y.Text
- [ ] Test: Y.Text updates appear in ProseMirror
- [ ] Test: undo/redo works
- [ ] Test: cursor positions tracked
- [ ] All tests pass ✓

### Phase 5.4: CRDT Persistence

- [ ] Create `src/crdt/persistence.ts`
- [ ] Implement `saveDocumentState(ydoc, docId): void`
- [ ] Implement `loadDocumentState(docId): Y.Doc`
- [ ] Implement `encryptYDocUpdates(updates, key): Encrypted`
- [ ] Implement `decryptYDocUpdates(encrypted, key): Updates`
- [ ] Create `test/unit/crdt/persistence.test.ts`
- [ ] Test: can save Y.Doc state
- [ ] Test: can load Y.Doc state
- [ ] Test: can encrypt updates
- [ ] Test: can decrypt updates
- [ ] Test: persistence → load → same state
- [ ] All tests pass ✓

### Phase 5.5: CRDT Integration

- [ ] Create `test/integration/crdt/collaboration.test.ts`
- [ ] Test: two users editing same doc (local Y.Docs)
- [ ] Test: edits sync via update exchange
- [ ] Test: concurrent edits merge without conflicts
- [ ] Test: encryption doesn't break CRDT
- [ ] Test: persistence works with encrypted updates
- [ ] Document CRDT API in `src/crdt/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 5: CRDT integration complete (local)"

---

## Phase 6: P2P Layer (Mocked in Sandbox)

**Goal**: P2P interfaces working with mocks
**Time**: 6-8 hours
**Dependencies**: Phase 5
**Network**: None (all mocked)

### Phase 6.1: P2P Interfaces

- [ ] Create `src/p2p/interface.ts`
- [ ] Define `IPeer` interface
- [ ] Define `IConnection` interface
- [ ] Define `ISignaling` interface
- [ ] Define message types (connect, data, etc)
- [ ] Create `src/p2p/events.ts` for event types
- [ ] Document all interfaces with JSDoc

### Phase 6.2: Mock Peer Implementation

- [ ] Create `src/p2p/mock-peer.ts`
- [ ] Implement `MockPeer` class (for testing)
- [ ] Implement in-memory connection between peers
- [ ] Implement `send(data): void` (in-memory)
- [ ] Implement `receive()` event emitter
- [ ] Create `test/unit/p2p/mock-peer.test.ts`
- [ ] Test: can create mock peers
- [ ] Test: can connect two mock peers
- [ ] Test: can send data between peers
- [ ] Test: can receive data from peers
- [ ] Test: connection events work
- [ ] All tests pass ✓

### Phase 6.3: Signaling (Mocked)

- [ ] Create `src/p2p/signaling.ts`
- [ ] Implement `generateShareCode(offer): string`
- [ ] Implement `parseShareCode(code): Offer`
- [ ] Implement `generateQRCode(code): string` (base64)
- [ ] Create `test/unit/p2p/signaling.test.ts`
- [ ] Test: can generate share codes
- [ ] Test: can parse share codes
- [ ] Test: roundtrip works (generate → parse)
- [ ] Test: QR codes generate (mocked canvas)
- [ ] All tests pass ✓

### Phase 6.4: Sync Protocol

- [ ] Create `src/p2p/sync.ts`
- [ ] Implement `sendInitialSync(peer, ydoc): void`
- [ ] Implement `handleInitialSync(data, ydoc): void`
- [ ] Implement `sendUpdate(peer, update): void`
- [ ] Implement `handleUpdate(data, ydoc): void`
- [ ] Create `test/unit/p2p/sync.test.ts`
- [ ] Test: initial sync sends full state
- [ ] Test: updates send incremental changes
- [ ] Test: received updates apply correctly
- [ ] Test: sync protocol with mock peers works
- [ ] Test: two docs sync via mock connection
- [ ] All tests pass ✓

### Phase 6.5: Connection Manager (Mocked)

- [ ] Create `src/p2p/connection-manager.ts`
- [ ] Implement `ConnectionManager` class
- [ ] Implement `connect(shareCode): Connection`
- [ ] Implement `disconnect(peerId): void`
- [ ] Implement `listConnections(): Connection[]`
- [ ] Implement reconnection logic
- [ ] Create `test/unit/p2p/connection-manager.test.ts`
- [ ] Test: can manage multiple connections
- [ ] Test: can disconnect peers
- [ ] Test: reconnection attempts work (mocked)
- [ ] Test: connection state tracked correctly
- [ ] All tests pass ✓

### Phase 6.6: P2P Integration (Mocked)

- [ ] Create `test/integration/p2p/collaboration.test.ts`
- [ ] Test: two mock peers collaborate on document
- [ ] Test: edits sync via mock P2P
- [ ] Test: disconnect → reconnect works
- [ ] Test: multiple peers (3+) sync correctly
- [ ] Test: encrypted updates work over P2P
- [ ] Document P2P API in `src/p2p/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 6: P2P layer complete (mocked)"

**🎯 SECOND DEMO POINT** - Can show collaboration (mocked)!

---

## Phase 7: Search (Pure Sandbox)

**Goal**: Full-text search working locally
**Time**: 3-4 hours
**Dependencies**: Phase 4
**Network**: None (all local)

### Phase 7.1: MiniSearch Setup

- [ ] Install `minisearch@^6.3.0`
- [ ] Create `src/search/indexer.ts`
- [ ] Implement `SearchIndexer` class
- [ ] Implement `addDocument(doc): void`
- [ ] Implement `removeDocument(docId): void`
- [ ] Implement `updateDocument(doc): void`
- [ ] Create `test/unit/search/indexer.test.ts`
- [ ] Test: can add documents to index
- [ ] Test: can remove documents from index
- [ ] Test: can update documents in index
- [ ] All tests pass ✓

### Phase 7.2: Search Queries

- [ ] Create `src/search/query.ts`
- [ ] Implement `search(query, options): Results`
- [ ] Implement `searchWithFilters(query, filters): Results`
- [ ] Implement `searchByTags(tags): Results`
- [ ] Implement `fuzzySearch(query): Results`
- [ ] Create `test/unit/search/query.test.ts`
- [ ] Test: basic search works
- [ ] Test: can filter by folder
- [ ] Test: can search by tags
- [ ] Test: fuzzy search handles typos
- [ ] Test: search ranking works
- [ ] Test: can boost title matches
- [ ] All tests pass ✓

### Phase 7.3: Search Integration

- [ ] Create `test/integration/search/full-search.test.ts`
- [ ] Test: index documents → search → find results
- [ ] Test: encrypted docs are decrypted for indexing
- [ ] Test: search works with large document set (1000+)
- [ ] Test: incremental indexing (add/update/delete)
- [ ] Test: search performance (<50ms for 1000 docs)
- [ ] Document search API in `src/search/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 7: Search complete"

---

## Phase 8: Sharing & UCAN (Mocked Network)

**Goal**: Sharing system working without real network
**Time**: 5-6 hours
**Dependencies**: Phase 4, Phase 6
**Network**: None (mocked)

### Phase 8.1: Basic UCAN Tokens

- [ ] Install `@ucan/core@^0.2.0` (or implement subset)
- [ ] Create `src/sharing/ucan.ts`
- [ ] Implement `generateToken(issuer, audience, cap): Token`
- [ ] Implement `verifyToken(token): boolean`
- [ ] Implement `parseToken(token): TokenData`
- [ ] Create `test/unit/sharing/ucan.test.ts`
- [ ] Test: can generate UCAN tokens
- [ ] Test: can verify valid tokens
- [ ] Test: can parse token data
- [ ] Test: expired tokens fail verification
- [ ] Test: invalid signatures fail verification
- [ ] All tests pass ✓

### Phase 8.2: Document Sharing

- [ ] Create `src/sharing/share.ts`
- [ ] Implement `shareDocument(docId, userId, perms): Share`
- [ ] Implement `acceptShare(shareToken): Document`
- [ ] Implement `revokeShare(shareId): void`
- [ ] Implement `listShares(docId): Share[]`
- [ ] Create `test/unit/sharing/share.test.ts`
- [ ] Test: can share document with user
- [ ] Test: can accept share
- [ ] Test: shared user can decrypt document
- [ ] Test: can revoke share
- [ ] Test: revoked user can't decrypt
- [ ] All tests pass ✓

### Phase 8.3: Permission System

- [ ] Create `src/sharing/permissions.ts`
- [ ] Define permission levels (Read, Write, Admin)
- [ ] Implement `checkPermission(userId, docId, perm): boolean`
- [ ] Implement `grantPermission(userId, docId, perm): void`
- [ ] Implement `revokePermission(userId, docId): void`
- [ ] Create `test/unit/sharing/permissions.test.ts`
- [ ] Test: permission checks work
- [ ] Test: can grant permissions
- [ ] Test: can revoke permissions
- [ ] Test: permission inheritance (folder → docs)
- [ ] All tests pass ✓

### Phase 8.4: Sharing Integration

- [ ] Create `test/integration/sharing/full-share.test.ts`
- [ ] Test: user A shares doc with user B
- [ ] Test: user B can access and decrypt doc
- [ ] Test: user B can edit doc (if Write permission)
- [ ] Test: edits sync between users (mocked P2P)
- [ ] Test: revoke → user B loses access
- [ ] Document sharing API in `src/sharing/README.md`
- [ ] All integration tests pass ✓

**Commit**: "Phase 8: Sharing & UCAN complete (mocked)"

---

## Phase 9: Main API & Service Layer

**Goal**: Unified API for all functionality
**Time**: 4-5 hours
**Dependencies**: All previous phases
**Network**: None (all mocked)

### Phase 9.1: Service Layer

- [ ] Create `src/services/` directory
- [ ] Create `UserService` class
- [ ] Create `DocumentService` class
- [ ] Create `CollaborationService` class
- [ ] Create `ShareService` class
- [ ] Each service aggregates lower-level APIs
- [ ] Create `test/unit/services/` tests
- [ ] Test: all services work independently
- [ ] Test: services integrate correctly
- [ ] All tests pass ✓

### Phase 9.2: Main Osvauld Class

- [ ] Create `src/osvauld.ts`
- [ ] Implement `Osvauld` class (main entry point)
- [ ] Constructor takes config (storage, auth, etc)
- [ ] Expose auth methods
- [ ] Expose document methods
- [ ] Expose collaboration methods
- [ ] Expose search methods
- [ ] Expose sharing methods
- [ ] Create `test/unit/osvauld.test.ts`
- [ ] Test: can initialize Osvauld instance
- [ ] Test: all methods are accessible
- [ ] Test: config is applied correctly
- [ ] All tests pass ✓

### Phase 9.3: Main Entry Point

- [ ] Create `src/index.ts` (package entry point)
- [ ] Export `Osvauld` class
- [ ] Export all types
- [ ] Export utility functions
- [ ] Create `README.md` with usage examples
- [ ] Create `API.md` with full API documentation
- [ ] Add TypeScript declarations
- [ ] Verify can be imported in test project
- [ ] All exports work correctly ✓

### Phase 9.4: End-to-End Integration

- [ ] Create `test/integration/e2e/full-workflow.test.ts`
- [ ] Test: signup → create doc → encrypt → save
- [ ] Test: login → load doc → decrypt → edit
- [ ] Test: share doc → other user receives → edit
- [ ] Test: collaborate → edits sync → CRDT merges
- [ ] Test: search → find docs → open → edit
- [ ] Test: all features work together
- [ ] All E2E tests pass ✓

**Commit**: "Phase 9: Main API & services complete"

**🎯 THIRD DEMO POINT** - Full system working (in sandbox)!

---

## Phase 10: CLI Tool (Optional)

**Goal**: Simple CLI for testing/demos
**Time**: 3-4 hours
**Dependencies**: Phase 9
**Network**: None (can work offline)

### Phase 10.1: CLI Setup

- [ ] Create `typescript-port/packages/cli/` directory
- [ ] Initialize package
- [ ] Install `commander@^11.0.0`
- [ ] Install `inquirer@^9.0.0`
- [ ] Install `chalk@^5.0.0`
- [ ] Install `ora@^7.0.0`
- [ ] Create `src/cli.ts`

### Phase 10.2: CLI Commands

- [ ] Implement `osvauld init` (create account)
- [ ] Implement `osvauld login` (authenticate)
- [ ] Implement `osvauld create` (create document)
- [ ] Implement `osvauld list` (list documents)
- [ ] Implement `osvauld share` (share document)
- [ ] Implement `osvauld search` (search documents)
- [ ] Add `--help` for all commands
- [ ] Add interactive prompts for missing args

### Phase 10.3: CLI Testing

- [ ] Test all commands work
- [ ] Test error handling
- [ ] Test help text
- [ ] Create demo script showing all features
- [ ] Document CLI in README

**Commit**: "Phase 10: CLI tool complete"

---

## Phase 11: Frontend Demo (Optional, Mocked)

**Goal**: Simple web UI for demos
**Time**: 4-6 hours
**Dependencies**: Phase 9
**Network**: Mocked

### Phase 11.1: Vite + Svelte Setup

- [ ] Create `typescript-port/packages/demo-app/` directory
- [ ] Initialize Vite project
- [ ] Install Svelte
- [ ] Setup basic layout
- [ ] Configure to use `@osvauld/core`

### Phase 11.2: Basic UI Components

- [ ] Create login screen
- [ ] Create document list
- [ ] Create document editor (ProseMirror)
- [ ] Create share dialog
- [ ] Style with Tailwind (optional)

### Phase 11.3: Demo Integration

- [ ] Connect UI to Osvauld API
- [ ] Use mocked P2P for collaboration
- [ ] Test all workflows in browser
- [ ] Can demo full system in browser!

**Commit**: "Phase 11: Demo frontend complete"

---

## Phase 12: Real Network Integration (REQUIRES EXTERNAL)

**Goal**: Replace mocks with real implementations
**Time**: 8-10 hours
**Dependencies**: All previous phases
**Network**: **REQUIRED** (WebRTC, signaling server, etc)

⚠️ **NOTE**: This phase requires external APIs
⚠️ **NOTE**: Should be done last after all sandbox work
⚠️ **NOTE**: May need manual testing outside sandbox

### Phase 12.1: Real WebRTC

- [ ] Install `simple-peer@^9.11.0`
- [ ] Create `src/p2p/webrtc.ts` (real implementation)
- [ ] Implement `WebRTCPeer` class
- [ ] Replace `MockPeer` with `WebRTCPeer`
- [ ] Test with real STUN servers
- [ ] Test NAT traversal
- [ ] ⚠️ Requires network access

### Phase 12.2: Real Signaling Server

- [ ] Create simple signaling server (WebSocket)
- [ ] Deploy signaling server (optional)
- [ ] Or use QR code/manual exchange
- [ ] Test real peer connections
- [ ] ⚠️ Requires network access

### Phase 12.3: Real Network Testing

- [ ] Test on different networks
- [ ] Test behind NAT
- [ ] Test mobile vs desktop
- [ ] Test multiple peers
- [ ] Performance testing
- [ ] ⚠️ Requires network access

**Commit**: "Phase 12: Real network integration complete"

---

## Phase 13: Benchmarking & Optimization

**Goal**: Ensure TypeScript matches Rust performance
**Time**: 3-4 hours
**Dependencies**: All previous phases
**Network**: None (local benchmarks)

### Phase 13.1: Benchmark Suite

- [ ] Create `benchmark/` directory
- [ ] Benchmark crypto operations vs Rust
- [ ] Benchmark storage operations
- [ ] Benchmark CRDT operations
- [ ] Benchmark search performance
- [ ] Document results in `BENCHMARKS.md`

### Phase 13.2: Optimization

- [ ] Profile slow operations
- [ ] Optimize hot paths
- [ ] Reduce allocations
- [ ] Improve algorithms if needed
- [ ] Re-run benchmarks
- [ ] Document improvements

**Commit**: "Phase 13: Benchmarking & optimization complete"

---

## Phase 14: Documentation & Polish

**Goal**: Complete documentation for handoff
**Time**: 2-3 hours
**Dependencies**: All previous phases

### Phase 14.1: API Documentation

- [ ] Complete `API.md` with all endpoints
- [ ] Add examples for every feature
- [ ] Document all types
- [ ] Add troubleshooting guide
- [ ] Add migration guide from Rust

### Phase 14.2: Developer Documentation

- [ ] Complete `CONTRIBUTING.md`
- [ ] Document architecture in `ARCHITECTURE.md`
- [ ] Create diagrams (optional)
- [ ] Document testing strategy
- [ ] Document deployment

### Phase 14.3: Demo & Presentation

- [ ] Create demo script
- [ ] Record demo video (optional)
- [ ] Create comparison doc (TS vs Rust)
- [ ] Prepare presentation for original devs
- [ ] List all achieved features

**Commit**: "Phase 14: Documentation complete"

---

## Success Criteria

### Functional Requirements

- [ ] All crypto operations work (Ed25519, AES-GCM, Argon2)
- [ ] Storage works (IndexedDB)
- [ ] Authentication works (Mnemonic, MetaMask, Passkey)
- [ ] Documents can be encrypted/decrypted
- [ ] CRDT collaboration works
- [ ] P2P sync works (at least with mocks)
- [ ] Search works
- [ ] Sharing works

### Performance Requirements

- [ ] Crypto: 80-95% of Rust speed
- [ ] Storage: Similar to Rust
- [ ] CRDT: Same as Rust (both use Yjs)
- [ ] Search: <50ms for 1000 documents

### Quality Requirements

- [ ] 80%+ test coverage
- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript strict mode enabled
- [ ] All APIs documented

### Demo Requirements

- [ ] Can create account with mnemonic
- [ ] Can login and recover from mnemonic
- [ ] Can create encrypted documents
- [ ] Can collaborate (at least with mocks)
- [ ] Can search documents
- [ ] Can share documents

---

## Timeline Estimate

### Conservative Estimate (Solo, with AI)

- Phase 0: 2-3 hours
- Phase 1: 6-8 hours
- Phase 2: 4-6 hours
- Phase 3: 4-5 hours (🎯 FIRST DEMO)
- Phase 4: 5-6 hours
- Phase 5: 5-6 hours
- Phase 6: 6-8 hours (🎯 SECOND DEMO)
- Phase 7: 3-4 hours
- Phase 8: 5-6 hours
- Phase 9: 4-5 hours (🎯 THIRD DEMO)
- Phase 10: 3-4 hours (optional)
- Phase 11: 4-6 hours (optional)
- Phase 12: 8-10 hours (requires network)
- Phase 13: 3-4 hours
- Phase 14: 2-3 hours

**Total Core (Phases 0-9)**: ~50-60 hours (6-8 days full-time)
**Total with Optional**: ~60-75 hours (8-10 days full-time)
**Total with Network**: ~70-85 hours (9-11 days full-time)

### Key Milestones

- **After Phase 3** (~12-15 hours): Auth working → Demo to devs
- **After Phase 6** (~30-35 hours): Collaboration (mocked) → Demo
- **After Phase 9** (~50-60 hours): Full system (sandbox) → Demo
- **After Phase 12** (~70-85 hours): Real network → Production

---

## Notes for AI Agents

### Sandbox Development Tips

1. **Use mocks aggressively**: Mock IndexedDB, WebRTC, etc
2. **Test locally**: All tests should run in sandbox
3. **No network calls**: Until Phase 12
4. **Use fixtures**: Create test data fixtures
5. **Incremental commits**: Commit after every phase

### Common Mocks Needed

- `fake-indexeddb`: For IndexedDB in Node.js
- `window.ethereum`: For MetaMask
- `navigator.credentials`: For WebAuthn
- `RTCPeerConnection`: For WebRTC
- `WebSocket`: For signaling (or use in-memory)

### Testing Without Network

- Use `MockPeer` for P2P tests
- Use in-memory message passing
- Test with multiple local Y.Docs
- Simulate network conditions (delay, packet loss)

### When You Get Stuck

- Check `koder/docs/` for reference
- Look at Rust implementation for logic
- Each phase should be ~2-4 hours
- If taking longer, break into smaller todos
- Commit frequently!

---

## Related Documents

- `koder/docs/OSVAULD_COMPREHENSIVE_REVIEW.md`: Full codebase review
- `koder/docs/TYPESCRIPT_REBUILD_EVALUATION.md`: Feasibility analysis
- `koder/docs/PURE_TYPESCRIPT_FEASIBILITY.md`: Why pure TypeScript
- `koder/docs/PHASED_IMPLEMENTATION_STRATEGY.md`: Strategy overview

---

**END OF PLAN**

Ready to start Phase 0! 🚀
