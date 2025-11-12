/**
 * Browser-compatible Buffer utilities
 *
 * Provides Buffer-like functionality without requiring Node.js Buffer
 */

/**
 * Convert Uint8Array to hex string
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 string
 */
export function toBase64(bytes: Uint8Array): string {
  // Convert to binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Browser-compatible Buffer replacement
 */
export const BufferCompat = {
  from(data: Uint8Array | string, encoding?: string): { toString(encoding: string): string } {
    if (typeof data === 'string') {
      if (encoding === 'hex') {
        return {
          toString: () => data
        };
      } else if (encoding === 'base64') {
        const bytes = fromBase64(data);
        return {
          toString: (enc: string) => {
            if (enc === 'hex') return toHex(bytes);
            if (enc === 'base64') return toBase64(bytes);
            // Default to utf-8
            return new TextDecoder().decode(bytes);
          }
        };
      }
      // Default: treat as utf-8 string
      const bytes = new TextEncoder().encode(data);
      return {
        toString: (enc: string) => {
          if (enc === 'hex') return toHex(bytes);
          if (enc === 'base64') return toBase64(bytes);
          return data;
        }
      };
    }

    // data is Uint8Array
    return {
      toString: (encoding: string) => {
        if (encoding === 'hex') return toHex(data);
        if (encoding === 'base64') return toBase64(data);
        // Default to utf-8
        return new TextDecoder().decode(data);
      }
    };
  }
};
