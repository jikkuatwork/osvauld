/**
 * Test fixtures for encryption keys
 */

export const testKeys = {
  alice: {
    publicKey:
      '302a300506032b657003210' +
      '0c0dc6eab8f6372ce0e33f8c3c6b3b5d5e9f4a3b2c1d0e9f',
    privateKey:
      '302e020100300506032b6570042204' +
      '20a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
  },
  bob: {
    publicKey:
      '302a300506032b657003210' +
      '0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    privateKey:
      '302e020100300506032b6570042204' +
      '20b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
  },
};

export const testSalts = {
  salt1: new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  ]),
  salt2: new Uint8Array([
    16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  ]),
};

export const testEncryptedData = {
  sample1: {
    ciphertext: 'encrypted-data-here-would-be-base64-or-hex-encoded',
    iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    tag: new Uint8Array([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]),
  },
};
