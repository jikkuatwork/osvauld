# Crypto Module

Comprehensive cryptographic operations for Osvauld.

## Features

- **Ed25519 Digital Signatures** - Fast, secure signatures
- **AES-GCM Encryption** - Authenticated encryption
- **Argon2 Key Derivation** - Password-based key derivation
- **BIP39 Mnemonics** - Human-readable key backup

## Usage

### Ed25519 Signatures

```typescript
import { generateKeyPair, sign, verify } from '@osvauld/core/crypto';

// Generate key pair
const keyPair = await generateKeyPair();

// Sign message
const signature = await sign('Hello, World!', keyPair.privateKey);

// Verify signature
const isValid = await verify(signature, 'Hello, World!', keyPair.publicKey);
```

### AES-GCM Encryption

```typescript
import { generateKey, encrypt, decryptString } from '@osvauld/core/crypto';

// Generate encryption key
const key = await generateKey();

// Encrypt
const encrypted = await encrypt('Secret message', key);

// Decrypt
const decrypted = await decryptString(encrypted, key);
```

### Argon2 Key Derivation

```typescript
import { deriveKey, generateSalt } from '@osvauld/core/crypto';

// Derive key from password
const salt = generateSalt();
const key = deriveKey('password', salt, {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
});
```

### BIP39 Mnemonic

```typescript
import {
  generateMnemonic,
  mnemonicToSeed,
  deriveKeyPair,
} from '@osvauld/core/crypto';

// Generate mnemonic
const mnemonic = generateMnemonic(); // 12 words

// Convert to seed
const seed = await mnemonicToSeed(mnemonic);

// Derive key pair
const keyPair = deriveKeyPair(seed, "m/44'/0'/0'/0/0");
```

## Security

- All crypto uses audited libraries (@noble, Web Crypto API)
- Constant-time comparisons for password verification
- Secure random number generation
- Authenticated encryption (AES-GCM)
- Industry-standard key derivation (Argon2id)

## Performance

Benchmarks on standard hardware:

- Ed25519 sign: ~0.75ms
- Ed25519 verify: ~2.07ms
- AES-GCM encrypt: ~0.08ms
- AES-GCM decrypt: ~0.07ms
- Argon2 (64MB): ~100ms
- Mnemonic generation: ~0.21ms
- Key derivation: ~2.21ms
