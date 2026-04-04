/**
 * Media encoding metadata — sibling API to storage.
 *
 * Associates content-negotiation metadata with stored artifacts so file
 * viewers and local tooling can present data appropriately.
 *
 * Multiple encodings can coexist per artifact:
 *   { type: 'table', sortRowsBy: 'sync:matrix' }
 *   { type: 'matrix', projection: 'object-property', rowLabel: 'object:name', default: true }
 */

const ENCODING_SUFFIX = '.__encoding__';

export default function createMediaEncoding(store) {
  return {
    async getEncodings(key) {
      const result = await store.getJSON(`${key}${ENCODING_SUFFIX}`);
      return Array.isArray(result) ? result : [];
    },

    async setEncodings(key, encodings) {
      await store.setJSON(`${key}${ENCODING_SUFFIX}`, encodings);
    },

    async addEncoding(key, encoding) {
      const existing = await this.getEncodings(key);
      existing.push(encoding);
      await this.setEncodings(key, existing);
    },

    async removeEncodings(key) {
      await store.delete(`${key}${ENCODING_SUFFIX}`);
    },

    async getDefaultEncoding(key) {
      const encodings = await this.getEncodings(key);
      return encodings.find((e) => e.default) || encodings[0];
    },
  };
}
