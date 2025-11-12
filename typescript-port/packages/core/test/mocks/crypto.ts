/**
 * Crypto mocks for testing
 *
 * Provides mock implementations for Web Crypto API if needed
 */

/**
 * Mock MetaMask ethereum provider
 */
export class MockMetaMask {
  public selectedAddress: string | null = null;
  private accounts: string[] = [];

  constructor(accounts: string[] = ['0x1234567890abcdef']) {
    this.accounts = accounts;
    this.selectedAddress = accounts[0] || null;
  }

  async request(args: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    switch (args.method) {
      case 'eth_requestAccounts':
        return this.accounts;
      case 'eth_accounts':
        return this.accounts;
      case 'personal_sign':
        // Mock signature
        return '0xmocksignature' + Date.now();
      default:
        throw new Error(`Unsupported method: ${args.method}`);
    }
  }

  isMetaMask = true;
}

/**
 * Mock WebAuthn credentials API
 */
export class MockCredentials {
  private credentials: Map<string, unknown> = new Map();

  async create(_options: CredentialCreationOptions): Promise<Credential | null> {
    const id = 'mock-credential-' + Date.now();
    const credential = {
      id,
      type: 'public-key',
      rawId: new ArrayBuffer(32),
    };
    this.credentials.set(id, credential);
    return credential as Credential;
  }

  async get(_options: CredentialRequestOptions): Promise<Credential | null> {
    // Return first credential for testing
    const first = this.credentials.values().next().value;
    return (first as Credential) || null;
  }

  clear(): void {
    this.credentials.clear();
  }
}

/**
 * Setup mocked Web APIs in global scope
 */
export function setupMockWebAPIs(): void {
  // Mock window.ethereum (MetaMask)
  if (typeof window !== 'undefined') {
    (window as { ethereum?: MockMetaMask }).ethereum = new MockMetaMask();
  } else {
    (global as { ethereum?: MockMetaMask }).ethereum = new MockMetaMask();
  }

  // Mock navigator.credentials (WebAuthn)
  if (typeof navigator !== 'undefined') {
    (navigator as { credentials?: MockCredentials }).credentials =
      new MockCredentials();
  } else {
    (global as { navigator?: { credentials: MockCredentials } }).navigator = {
      credentials: new MockCredentials(),
    };
  }
}

/**
 * Cleanup mocked Web APIs
 */
export function cleanupMockWebAPIs(): void {
  if (typeof window !== 'undefined') {
    delete (window as { ethereum?: MockMetaMask }).ethereum;
  } else {
    delete (global as { ethereum?: MockMetaMask }).ethereum;
  }
}
