/**
 * Compliance policy presets for sensitivity scanning and protection.
 *
 * Each preset defines the categories, threshold, and protection strategy
 * appropriate for a specific regulatory framework. Use with sensitivityGuard:
 *
 *   await sensitivityGuard(text, sensitivityPolicy.HIPAA)
 */

export const sensitivityPolicy = {
  HIPAA: {
    categories: [
      'pii-name',
      'pii-government-id',
      'pii-dob',
      'pii-demographic',
      'contact-email',
      'contact-phone',
      'contact-address',
      'contact-social',
      'financial-account',
      'medical-diagnosis',
      'medical-treatment',
      'medical-records',
      'medical-mental',
      'medical-genetic',
      'biometric',
      'location-ip',
    ],
    threshold: 0.3,
    protection: 'redact',
    mode: 'placeholder',
    verify: true,
  },

  GDPR: {
    categories: [
      'pii-name',
      'pii-government-id',
      'pii-dob',
      'pii-demographic',
      'contact-email',
      'contact-phone',
      'contact-address',
      'contact-social',
      'financial-account',
      'financial-card',
      'financial-income',
      'financial-tax',
      'medical-diagnosis',
      'medical-treatment',
      'medical-records',
      'medical-mental',
      'medical-genetic',
      'credential-password',
      'credential-key',
      'legal-case',
      'legal-privilege',
      'legal-criminal',
      'location-gps',
      'location-tracking',
      'location-ip',
      'employment-review',
      'employment-background',
      'minor-identity',
      'biometric',
    ],
    threshold: 0.35,
    protection: 'depersonalize',
    method: 'balanced',
    verify: true,
  },

  PCI_DSS: {
    categories: [
      'pii-name',
      'financial-account',
      'financial-card',
      'credential-password',
      'credential-key',
    ],
    threshold: 0.3,
    protection: 'redact',
    mode: 'placeholder',
  },

  COPPA: {
    categories: [
      'pii-name',
      'pii-government-id',
      'pii-dob',
      'contact-email',
      'contact-phone',
      'contact-address',
      'contact-social',
      'location-gps',
      'location-tracking',
      'location-ip',
      'minor-identity',
      'biometric',
    ],
    threshold: 0.3,
    protection: 'redact',
    mode: 'placeholder',
    verify: true,
  },
};
