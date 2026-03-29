// Node.js entry point for verblets
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setProjectOverrides } from './lib/llm/config.js';

// Load environment variables from .env file
dotenv.config();

// Load project model overrides from .verblets.json (synchronous, no race)
try {
  setProjectOverrides(JSON.parse(readFileSync(resolve(process.cwd(), '.verblets.json'), 'utf8')));
} catch {
  // No .verblets.json — use defaults
}

// Export all shared browser-compatible modules
export * from './shared.js';

// Node-only exports (image/screenshot utilities)
export { default as createScreenshotDir, cleanupPaths } from './lib/screenshot-cleanup/index.js';
export {
  resizeImage,
  tileImages,
  imageToBase64,
  setImageProcessingEnabled,
  mapImageShrink,
} from './lib/image-utils/index.js';

// Node-only exports (browser automation)
export { default as webScrape } from './chains/web-scrape/index.js';
export {
  default as siteCrawl,
  extractPage,
  extractLinks,
  extractForms,
  extractButtons,
  extractScripts,
  extractMeta,
  extractStructure,
} from './chains/site-crawl/index.js';

// Node-only exports (codebase utilities)
export { default as aiArchExpect } from './chains/ai-arch-expect/index.js';
export { default as scanJS } from './chains/scan-js/index.js';
export { default as test } from './chains/test/index.js';
export { default as testAdvice } from './chains/test-advice/index.js';

// Default export
export { llm as default } from './shared.js';
