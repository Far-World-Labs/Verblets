// ── Schemas for prompt-piece reshape advisor ─────────────────────────
// Each schema follows the verblets convention: items[] for arrays,
// value{} for single objects. callLlm auto-unwraps.

// ── Shared sub-schemas for suggestion model ─────────────────────────

const inputChangeItemSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['add', 'remove', 'modify'],
      description:
        'Whether to add a new input, remove an existing one, or modify one. Splits = remove + adds. Merges = removes + add.',
    },
    id: {
      type: 'string',
      description: 'Kebab-case identifier for the input',
    },
    label: {
      type: 'string',
      description: 'Human-readable label for the input',
    },
    placement: {
      type: 'string',
      enum: ['prepend', 'append'],
      description: 'Where to insert relative to the piece text',
    },
    required: {
      type: 'boolean',
      description: 'Whether this input must be filled before rendering',
    },
    multi: {
      type: 'boolean',
      description: 'Whether this input accepts multiple sources',
    },
    suggestedTags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Suggested routing tags for this input',
    },
    rationale: {
      type: 'string',
      description: 'Why this change improves the piece',
    },
  },
  required: [
    'action',
    'id',
    'label',
    'placement',
    'required',
    'multi',
    'suggestedTags',
    'rationale',
  ],
  additionalProperties: false,
};

const issueSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'What is wrong, missing, or improvable',
    },
    severity: {
      type: 'string',
      enum: ['critical', 'important', 'nice-to-have'],
      description: 'How impactful this issue is',
    },
  },
  required: ['description', 'severity'],
  additionalProperties: false,
};

const fixSchema = {
  type: 'object',
  properties: {
    near: {
      type: 'string',
      description:
        'Natural language description of where in the text to make the change — reference marker sections or distinctive phrases',
    },
    find: {
      type: 'string',
      description: 'The exact text to match at that location',
    },
    replace: {
      type: 'string',
      description: 'The replacement text',
    },
    rationale: {
      type: 'string',
      description: 'Why this change improves the piece',
    },
  },
  required: ['near', 'find', 'replace', 'rationale'],
  additionalProperties: false,
};

const textEditItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Kebab-case identifier for this edit, stable across re-runs',
    },
    category: {
      type: 'string',
      description: 'Freeform category (clarity, structure, specificity, tone, ...)',
    },
    issue: issueSchema,
    fix: fixSchema,
  },
  required: ['id', 'category', 'issue', 'fix'],
  additionalProperties: false,
};

const diagnosticItemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Kebab-case identifier for this diagnostic, stable across re-runs',
    },
    category: {
      type: 'string',
      description: 'Freeform category (clarity, structure, specificity, tone, ...)',
    },
    issue: issueSchema,
  },
  required: ['id', 'category', 'issue'],
  additionalProperties: false,
};

// ── Reshape schemas ─────────────────────────────────────────────────

// reshape (default): proposes structural changes + text suggestions
export const reshapeSchema = {
  name: 'prompt_piece_reshape',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          inputChanges: {
            type: 'array',
            items: inputChangeItemSchema,
          },
          textSuggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'What text change to make and where',
                },
                rationale: {
                  type: 'string',
                  description: 'Why this text change helps accommodate new material',
                },
              },
              required: ['description', 'rationale'],
              additionalProperties: false,
            },
          },
        },
        required: ['inputChanges', 'textSuggestions'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};

// reshape edits: structural changes + machine-applicable text edits
export const reshapeEditsSchema = {
  name: 'prompt_piece_reshape_edits',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          inputChanges: {
            type: 'array',
            items: inputChangeItemSchema,
          },
          textEdits: {
            type: 'array',
            items: textEditItemSchema,
          },
        },
        required: ['inputChanges', 'textEdits'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};

// reshape diagnostic: issues only, no fixes or structural changes
export const reshapeDiagnosticSchema = {
  name: 'prompt_piece_reshape_diagnostic',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          diagnostics: {
            type: 'array',
            items: diagnosticItemSchema,
          },
        },
        required: ['diagnostics'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};
