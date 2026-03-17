/**
 * Context Observers
 *
 * Detect system state and produce context kind attributes.
 * Called at init to populate long-lived context kinds.
 */

import { get as configGet } from '../config/index.js';
import version from '../version/index.js';
import { sensitivityAvailable } from '../../services/llm-model/index.js';
import { SENSITIVITY_CAPABILITY } from '../../constants/context.js';

export function observeApplication() {
  const environment = configGet('NODE_ENV') || 'development';
  return {
    key: 'default',
    environment,
    version,
  };
}

export function observeProviders() {
  const openai = !!configGet('OPENAI_API_KEY');
  const anthropic = !!configGet('ANTHROPIC_API_KEY');
  const openwebui = !!configGet('OPENWEBUI_API_KEY');
  const embeddingAvailable = openwebui;
  const redisConfigured = !!configGet('REDIS_HOST');

  const sensitivity = sensitivityAvailable();
  let sensitivityCapable;
  if (sensitivity.fast && sensitivity.good) {
    sensitivityCapable = SENSITIVITY_CAPABILITY.FULL;
  } else if (sensitivity.available) {
    sensitivityCapable = SENSITIVITY_CAPABILITY.FAST_ONLY;
  } else {
    sensitivityCapable = SENSITIVITY_CAPABILITY.NONE;
  }

  return {
    key: 'default',
    openai,
    anthropic,
    openwebui,
    sensitivityCapable,
    embeddingAvailable,
    redisConfigured,
  };
}
