import { describe, it, expect } from 'vitest';
import { version } from '../src/index';

describe('Sanity Check', () => {
  it('should have version defined', () => {
    expect(version).toBe('0.1.0');
  });
});
