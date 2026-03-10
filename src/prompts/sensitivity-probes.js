/**
 * Embedding probe query catalog for sensitivity screening.
 *
 * Each entry has a `category` key, a human-readable `label`, and one or more
 * `queries` designed for embedding-based semantic matching.  Embed the queries
 * (optionally via HyDE first) then use `cosineSimilarity` or `vectorSearch`
 * to flag chunks containing potentially sensitive content.
 */
export default [
  // -- Personal Identity -------------------------------------------------------
  {
    category: 'pii-name',
    label: 'Personal Names',
    queries: ["Contains a person's full name, first name, last name, nickname, or alias"],
  },
  {
    category: 'pii-government-id',
    label: 'Government IDs',
    queries: [
      "Contains social security numbers, passport numbers, driver's license numbers, or national identity numbers",
    ],
  },
  {
    category: 'pii-dob',
    label: 'Date of Birth',
    queries: ['Contains dates of birth, ages, or birthdate information'],
  },
  {
    category: 'pii-demographic',
    label: 'Demographics',
    queries: ['Contains gender identity, ethnicity, race, nationality, or religious affiliation'],
  },

  // -- Contact Information -----------------------------------------------------
  {
    category: 'contact-email',
    label: 'Email Addresses',
    queries: ['Contains email addresses or electronic mailing addresses'],
  },
  {
    category: 'contact-phone',
    label: 'Phone Numbers',
    queries: ['Contains telephone numbers, mobile numbers, fax numbers, or phone extensions'],
  },
  {
    category: 'contact-address',
    label: 'Physical Addresses',
    queries: ['Contains street addresses, mailing addresses, home addresses, or postal codes'],
  },
  {
    category: 'contact-social',
    label: 'Social Media',
    queries: ['Contains social media handles, profile URLs, usernames, or screen names'],
  },

  // -- Financial ---------------------------------------------------------------
  {
    category: 'financial-account',
    label: 'Financial Accounts',
    queries: ['Contains bank account numbers, routing numbers, IBAN, or SWIFT codes'],
  },
  {
    category: 'financial-card',
    label: 'Payment Cards',
    queries: [
      'Contains credit card numbers, debit card numbers, CVV codes, or card expiration dates',
    ],
  },
  {
    category: 'financial-income',
    label: 'Income & Compensation',
    queries: [
      'Contains salary information, income amounts, compensation packages, or wage details',
    ],
  },
  {
    category: 'financial-tax',
    label: 'Tax Information',
    queries: [
      'Contains tax return details, tax identification numbers, EIN, or tax filing information',
    ],
  },

  // -- Medical / Health --------------------------------------------------------
  {
    category: 'medical-diagnosis',
    label: 'Medical Diagnoses',
    queries: ['Contains medical diagnoses, health conditions, symptoms, or disease information'],
  },
  {
    category: 'medical-treatment',
    label: 'Medical Treatment',
    queries: [
      'Contains medications, prescriptions, dosages, medical procedures, or surgical details',
    ],
  },
  {
    category: 'medical-records',
    label: 'Medical Records',
    queries: [
      'Contains patient numbers, insurance IDs, medical record numbers, or health plan information',
    ],
  },
  {
    category: 'medical-mental',
    label: 'Mental Health',
    queries: [
      'Contains mental health information, therapy notes, psychiatric diagnoses, or counseling records',
    ],
  },
  {
    category: 'medical-genetic',
    label: 'Genetic Information',
    queries: [
      'Contains genetic test results, DNA information, hereditary conditions, or genomic data',
    ],
  },

  // -- Authentication / Credentials --------------------------------------------
  {
    category: 'credential-password',
    label: 'Passwords',
    queries: ['Contains passwords, PINs, passphrases, or security question answers'],
  },
  {
    category: 'credential-key',
    label: 'API Keys & Secrets',
    queries: [
      'Contains API keys, access tokens, secret keys, private keys, or authentication certificates',
    ],
  },

  // -- Legal -------------------------------------------------------------------
  {
    category: 'legal-case',
    label: 'Legal Proceedings',
    queries: ['Contains case numbers, docket IDs, court orders, or legal filing details'],
  },
  {
    category: 'legal-privilege',
    label: 'Privileged Communications',
    queries: [
      'Contains attorney-client communications, legal counsel advice, or privileged correspondence',
    ],
  },
  {
    category: 'legal-criminal',
    label: 'Criminal Records',
    queries: [
      'Contains criminal records, arrest records, conviction details, or investigation information',
    ],
  },

  // -- Location / Movement -----------------------------------------------------
  {
    category: 'location-gps',
    label: 'GPS / Coordinates',
    queries: [
      'Contains GPS coordinates, latitude/longitude, geolocation data, or precise location information',
    ],
  },
  {
    category: 'location-tracking',
    label: 'Movement Patterns',
    queries: [
      'Contains travel itineraries, location history, check-in records, or movement tracking data',
    ],
  },
  {
    category: 'location-ip',
    label: 'IP Addresses',
    queries: ['Contains IP addresses, MAC addresses, or network device identifiers'],
  },

  // -- Employment --------------------------------------------------------------
  {
    category: 'employment-review',
    label: 'Performance Reviews',
    queries: [
      'Contains performance evaluations, employee reviews, disciplinary actions, or HR records',
    ],
  },
  {
    category: 'employment-background',
    label: 'Background Checks',
    queries: [
      'Contains background check results, reference checks, or employment screening information',
    ],
  },

  // -- Minors / Children -------------------------------------------------------
  {
    category: 'minor-identity',
    label: "Minor's Information",
    queries: ["Contains children's names, ages, school information, or parental consent records"],
  },

  // -- Biometric ---------------------------------------------------------------
  {
    category: 'biometric',
    label: 'Biometric Data',
    queries: [
      'Contains fingerprints, facial recognition data, voice prints, retinal scans, or biometric identifiers',
    ],
  },

  // -- Proprietary / Trade Secret ----------------------------------------------
  {
    category: 'proprietary-code',
    label: 'Proprietary Code',
    queries: [
      'Contains proprietary source code, trade secret algorithms, or confidential technical implementations',
    ],
  },
  {
    category: 'proprietary-business',
    label: 'Business Secrets',
    queries: [
      'Contains confidential business plans, unreleased product details, pricing models, or customer lists',
    ],
  },
];
