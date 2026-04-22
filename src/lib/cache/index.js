import { createHash } from '../crypto/index.js';

function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ');
}

function canonicalize(instruction) {
  if (instruction === undefined) return '';
  if (typeof instruction === 'string') return normalizeText(instruction);
  if (instruction?.build) return canonicalize(instruction.build());
  if (typeof instruction === 'object') {
    return JSON.stringify(
      Object.keys(instruction)
        .toSorted()
        .reduce((acc, key) => {
          const val = instruction[key];
          acc[key] = typeof val === 'string' ? normalizeText(val) : val;
          return acc;
        }, {})
    );
  }
  return String(instruction);
}

/**
 * Hash an instruction into a stable hex digest representing semantic equivalence.
 * Normalizes whitespace, sorts object keys, and renders builders before hashing.
 *
 * @param {string|object|undefined} instruction
 * @returns {Promise<string>} SHA-256 hex digest
 */
export function hashInstructionEquivalence(instruction) {
  if (instruction === null) {
    throw new Error('Instruction must be a string, object, or undefined — null is not allowed');
  }
  const canonical = canonicalize(instruction);
  const hash = createHash('sha256');
  return hash.update(canonical).digest('hex');
}

/**
 * Compose a cache key from an instruction hash plus optional discriminators
 * (e.g. responseFormat, schema) that distinguish otherwise-equivalent instructions.
 *
 * @param {string|object|undefined} instruction
 * @param {...*} discriminators - Additional values that affect the LLM output
 * @returns {Promise<string>} Composite cache key
 */
export function instructionCacheKey(instruction, ...discriminators) {
  const instructionHash = hashInstructionEquivalence(instruction);
  const parts = [instructionHash];
  for (const d of discriminators) {
    if (d === undefined) continue;
    const hash = createHash('sha256');
    const data = typeof d === 'string' ? d : JSON.stringify(d);
    parts.push(hash.update(data).digest('hex'));
  }
  return parts.join(':');
}

/**
 * Create an in-memory instruction cache with optional TTL expiration.
 *
 * @param {object} [options]
 * @param {number} [options.ttl] - Time-to-live in milliseconds
 * @returns {{ get(key: string): Promise<{hit: boolean, value?: *}>, set(key: string, value: *): Promise<void>, clear(): void, size: number }}
 */
export function createInstructionCache({ ttl } = {}) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return { hit: false };
      if (ttl && Date.now() - entry.timestamp > ttl) {
        store.delete(key);
        return { hit: false };
      }
      return { hit: true, value: entry.value };
    },

    set(key, value) {
      store.set(key, { value, timestamp: Date.now() });
    },

    clear() {
      store.clear();
    },

    get size() {
      return store.size;
    },
  };
}
