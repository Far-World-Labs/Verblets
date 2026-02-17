/**
 * Provider registry — maps provider names to their adapters.
 */

import * as openai from './openai.js';
import * as anthropic from './anthropic.js';
import * as openwebui from './openwebui.js';

const providers = {
  openai,
  anthropic,
  openwebui,
};

export const getProvider = (providerName) => {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(
      `Unknown provider: '${providerName}'. Available: ${Object.keys(providers).join(', ')}`
    );
  }
  return provider;
};

export default getProvider;
