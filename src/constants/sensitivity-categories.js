/**
 * Sensitivity category metadata — severity tiers, placeholder labels, and generalizations.
 *
 * Pure data, no logic. Maps the 31 probe categories from sensitivity-probes.js
 * to metadata used by sensitivityClassify.
 */

export const SEVERITY_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };

export const severityAtLeast = (level, minLevel) =>
  (SEVERITY_ORDER[level] ?? -1) >= (SEVERITY_ORDER[minLevel] ?? -1);

export const CATEGORY_SEVERITY = {
  // critical
  'pii-government-id': 'critical',
  'credential-password': 'critical',
  'credential-key': 'critical',
  'medical-genetic': 'critical',
  'financial-card': 'critical',
  biometric: 'critical',

  // high
  'medical-diagnosis': 'high',
  'medical-treatment': 'high',
  'medical-records': 'high',
  'medical-mental': 'high',
  'financial-account': 'high',
  'financial-income': 'high',
  'financial-tax': 'high',
  'legal-case': 'high',
  'legal-privilege': 'high',
  'legal-criminal': 'high',
  'minor-identity': 'high',

  // medium
  'pii-name': 'medium',
  'pii-dob': 'medium',
  'contact-email': 'medium',
  'contact-phone': 'medium',
  'contact-address': 'medium',
  'contact-social': 'medium',
  'employment-review': 'medium',
  'employment-background': 'medium',

  // low
  'pii-demographic': 'low',
  'location-gps': 'low',
  'location-tracking': 'low',
  'location-ip': 'low',
  'proprietary-code': 'low',
  'proprietary-business': 'low',
};

export const PLACEHOLDER_PREFIXES = {
  'pii-name': 'PERSON',
  'pii-government-id': 'GOV_ID',
  'pii-dob': 'DOB',
  'pii-demographic': 'DEMOGRAPHIC',
  'contact-email': 'EMAIL',
  'contact-phone': 'PHONE',
  'contact-address': 'ADDRESS',
  'contact-social': 'SOCIAL',
  'financial-account': 'ACCOUNT',
  'financial-card': 'CARD',
  'financial-income': 'INCOME',
  'financial-tax': 'TAX_ID',
  'medical-diagnosis': 'DIAGNOSIS',
  'medical-treatment': 'TREATMENT',
  'medical-records': 'MEDICAL_RECORD',
  'medical-mental': 'MENTAL_HEALTH',
  'medical-genetic': 'GENETIC',
  'credential-password': 'PASSWORD',
  'credential-key': 'API_KEY',
  'legal-case': 'CASE_ID',
  'legal-privilege': 'PRIVILEGED',
  'legal-criminal': 'CRIMINAL_RECORD',
  'location-gps': 'COORDINATES',
  'location-tracking': 'LOCATION',
  'location-ip': 'IP_ADDRESS',
  'employment-review': 'REVIEW',
  'employment-background': 'BACKGROUND',
  'minor-identity': 'MINOR',
  biometric: 'BIOMETRIC',
  'proprietary-code': 'CODE',
  'proprietary-business': 'BUSINESS_SECRET',
};

export const GENERALIZATIONS = {
  'pii-name': 'a person',
  'pii-government-id': 'a government identifier',
  'pii-dob': 'a date of birth',
  'pii-demographic': 'demographic information',
  'contact-email': 'an email address',
  'contact-phone': 'a phone number',
  'contact-address': 'a physical address',
  'contact-social': 'a social media handle',
  'financial-account': 'a financial account',
  'financial-card': 'a payment card number',
  'financial-income': 'income information',
  'financial-tax': 'tax information',
  'medical-diagnosis': 'a medical condition',
  'medical-treatment': 'a medical treatment',
  'medical-records': 'a medical record identifier',
  'medical-mental': 'mental health information',
  'medical-genetic': 'genetic information',
  'credential-password': 'a credential',
  'credential-key': 'an API key',
  'legal-case': 'a legal case identifier',
  'legal-privilege': 'privileged communication',
  'legal-criminal': 'criminal record information',
  'location-gps': 'GPS coordinates',
  'location-tracking': 'location information',
  'location-ip': 'an IP address',
  'employment-review': 'a performance review',
  'employment-background': 'background check information',
  'minor-identity': "a minor's information",
  biometric: 'biometric data',
  'proprietary-code': 'proprietary code',
  'proprietary-business': 'confidential business information',
};
