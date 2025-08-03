// Browser entry point for verblets
import { mapBrowserEnv } from './lib/env/index.js';
mapBrowserEnv();

export * from './shared.js';
export { chatGPT as default } from './shared.js';
