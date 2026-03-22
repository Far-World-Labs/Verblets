// Browser-compatible crypto utilities
import { runtime } from '../env/index.js';

// Create SHA-256 hash
export const createHash = (algorithm) => {
  if (algorithm !== 'sha256') {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const chunks = [];

  return {
    update(data) {
      chunks.push(data);
      return this;
    },

    async digest(encoding) {
      const text = chunks.join('');

      if (runtime.isBrowser) {
        // Use Web Crypto API
        /* global TextEncoder, crypto */
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        if (encoding === 'hex') {
          return hashHex;
        }

        throw new Error(`Unsupported encoding: ${encoding}`);
      } else {
        // Use Node.js crypto
        const crypto = await import('node:crypto');
        const hash = crypto.createHash(algorithm);
        hash.update(text);
        return hash.digest(encoding);
      }
    },
  };
};

// Synchronous version for Node.js compatibility
export const createHashSync = (algorithm) => {
  if (!runtime.isNode) {
    throw new Error('createHashSync is only available in Node.js');
  }

  // eslint-disable-next-line no-undef
  const crypto = require('node:crypto');
  return crypto.createHash(algorithm);
};

// Default export for compatibility
export default {
  createHash,
  createHashSync,
};
