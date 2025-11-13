// Browser polyfills
import process from 'process/browser';
import { Buffer } from 'buffer';

// Set up globals
globalThis.process = process;
globalThis.Buffer = Buffer;
globalThis.global = globalThis;

export { process, Buffer };
