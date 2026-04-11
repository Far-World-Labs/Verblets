/**
 * Context Kind Vocabulary
 *
 * Value sets for the four context kinds: application, providers, request, content.
 * Pure data — no imports from other modules.
 */

// ── Context Kinds ─────────────────────────────────────────────────────

export const CONTEXT_KINDS = Object.freeze(['application', 'providers', 'request', 'content']);

// ── Application Kind ──────────────────────────────────────────────────

export const ENVIRONMENT = Object.freeze({
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
});

// ── Request Kind ─────────────────────────────────────────────────────

export const DOMAIN = Object.freeze({
  MEDICAL: 'medical',
  FINANCIAL: 'financial',
  LEGAL: 'legal',
  TECHNICAL: 'technical',
  GENERAL: 'general',
  UNKNOWN: 'unknown',
});

export const COMPLIANCE = Object.freeze({
  HIPAA: 'hipaa',
  GDPR: 'gdpr',
  PCI: 'pci',
  COPPA: 'coppa',
  NONE: 'none',
});

export const QUALITY_INTENT = Object.freeze({
  STANDARD: 'standard',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export const COST_POSTURE = Object.freeze({
  NORMAL: 'normal',
  CONSTRAINED: 'constrained',
  MINIMAL: 'minimal',
});
