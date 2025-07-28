// Browser-compatible fetch - just exports the native fetch
export default globalThis.fetch.bind(globalThis);

// Also export as named exports for compatibility
export const fetch = globalThis.fetch.bind(globalThis);

// Provide stubs for node-fetch specific exports if needed
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
