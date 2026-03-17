// ── Schemas for extend-prompt AI advisors ────────────────────────────
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

// proposeTags: recommends routing tags for inputs
export const proposeTagsSchema = {
  name: 'prompt_piece_propose_tags',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            inputId: {
              type: 'string',
              description: 'The input id these tags apply to',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recommended routing tags for this input',
            },
            rationale: {
              type: 'string',
              description: 'Why these tags are appropriate',
            },
            reuseExisting: {
              type: 'boolean',
              description: 'Whether all recommended tags already exist in the registry',
            },
          },
          required: ['inputId', 'tags', 'rationale', 'reuseExisting'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};

// tagSource: assigns routing tags to pieces/outputs
export const tagSourceSchema = {
  name: 'prompt_tag_source',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'A routing tag to assign to this source',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Confidence that this tag is appropriate',
            },
            needsReview: {
              type: 'boolean',
              description: 'Whether human approval is recommended',
            },
            rationale: {
              type: 'string',
              description: 'Why this tag fits the source content',
            },
          },
          required: ['tag', 'confidence', 'needsReview', 'rationale'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};

// tagReconcile: fixes tag mismatches when manual overrides conflict
export const tagReconcileSchema = {
  name: 'prompt_tag_reconcile',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          recommendation: {
            type: 'string',
            enum: ['add-tag-to-source', 'change-input-tags', 'new-tag'],
            description: 'Which repair strategy to use',
          },
          sourceTags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags to add to the source (for add-tag-to-source)',
          },
          inputTags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Replacement tags for the input (for change-input-tags)',
          },
          newTag: {
            type: 'string',
            description: 'New tag name (for new-tag strategy)',
          },
          rationale: {
            type: 'string',
            description: 'Why this repair strategy was chosen',
          },
        },
        required: ['recommendation', 'sourceTags', 'inputTags', 'rationale'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};

// tagConsolidate: proposes merges, deprecations, renames for routing tags
export const tagConsolidateSchema = {
  name: 'prompt_tag_consolidate',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          merges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to merge',
                },
                into: {
                  type: 'string',
                  description: 'Canonical tag name to keep',
                },
                rationale: { type: 'string' },
              },
              required: ['from', 'into', 'rationale'],
              additionalProperties: false,
            },
          },
          deprecations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tag: { type: 'string' },
                rationale: { type: 'string' },
              },
              required: ['tag', 'rationale'],
              additionalProperties: false,
            },
          },
          renames: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                rationale: { type: 'string' },
              },
              required: ['from', 'to', 'rationale'],
              additionalProperties: false,
            },
          },
        },
        required: ['merges', 'deprecations', 'renames'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};
