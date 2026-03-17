/**
 * Context Kind Vocabulary
 *
 * Value sets for the four context kinds: application, providers, request, content.
 * Pure data — no imports from other modules.
 */

// ── Context Kinds ─────────────────────────────────────────────────────

export const CONTEXT_KINDS = ['application', 'providers', 'request', 'content'];

// ── Application Kind ──────────────────────────────────────────────────

export const ENVIRONMENT = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
};

// ── Providers Kind ───────────────────────────────────────────────────

export const SENSITIVITY_CAPABILITY = {
  FULL: 'full',
  FAST_ONLY: 'fast-only',
  NONE: 'none',
};

// ── Request Kind ─────────────────────────────────────────────────────

export const DOMAIN = {
  MEDICAL: 'medical',
  FINANCIAL: 'financial',
  LEGAL: 'legal',
  TECHNICAL: 'technical',
  GENERAL: 'general',
  UNKNOWN: 'unknown',
};

export const COMPLIANCE = {
  HIPAA: 'hipaa',
  GDPR: 'gdpr',
  PCI: 'pci',
  COPPA: 'coppa',
  NONE: 'none',
};

export const QUALITY_INTENT = {
  STANDARD: 'standard',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const COST_POSTURE = {
  NORMAL: 'normal',
  CONSTRAINED: 'constrained',
  MINIMAL: 'minimal',
};

// ── Content Kind ─────────────────────────────────────────────────────

export const SENSITIVITY_LEVEL = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};
