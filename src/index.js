// Node.js entry point for verblets
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Export all shared browser-compatible modules
export * from './shared.js';

// Node-only exports (image/screenshot utilities)
export {
  default as createTempDir,
  cleanupPaths,
  resolveOutputDir,
} from './lib/temp-files/index.js';
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
