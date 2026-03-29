/**
 * LLM Config Constants
 *
 * Module-load-time config values read via the config provider.
 * Config provider handles type coercion and force overrides.
 */

import { get as configGet } from '../lib/config/index.js';

export const cacheTTL = configGet('VERBLETS_CACHE_TTL');

export const cachingEnabled = configGet('VERBLETS_DISABLE_CACHE') !== true;

export const frequencyPenalty = configGet('VERBLETS_FREQUENCY_PENALTY');

export const presencePenalty = configGet('VERBLETS_PRESENCE_PENALTY');

export const temperature = configGet('VERBLETS_TEMPERATURE');

export const topP = configGet('VERBLETS_TOPP');
