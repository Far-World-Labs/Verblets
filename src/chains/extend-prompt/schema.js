export const promptDescriptionSchema = {
  name: 'prompt_description',
  schema: {
    type: 'object',
    properties: {
      value: {
        type: 'object',
        properties: {
          purpose: {
            type: 'string',
            description: 'What this prompt does — its core function in one or two sentences',
          },
          inputs: {
            type: 'string',
            description: 'What input data the prompt expects to receive and operate on',
          },
          outputs: {
            type: 'string',
            description: 'What the prompt produces — output shape, format, and content',
          },
          qualities: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Observable quality characteristics of the output (e.g. domain-aware, PII-safe, format-constrained)',
          },
          gaps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Potential weaknesses, missing coverage, risks, or blind spots',
          },
        },
        required: ['purpose', 'inputs', 'outputs', 'qualities', 'gaps'],
        additionalProperties: false,
      },
    },
    required: ['value'],
    additionalProperties: false,
  },
};

export const extensionsSchema = {
  name: 'prompt_extensions',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique kebab-case identifier for idempotent merge',
            },
            type: {
              type: 'string',
              description:
                'Category of extension (e.g. context, output, alignment, construction, nfr, composition, side-effect)',
            },
            placement: {
              type: 'string',
              enum: ['prepend', 'append'],
              description: 'Where to insert relative to the original prompt',
            },
            preamble: {
              type: 'string',
              description:
                'The text to insert, with a single {{slot_name}} placeholder for content a human or system must provide',
            },
            slot: {
              type: 'string',
              description: 'The slot name matching the {{slot_name}} placeholder in the preamble',
            },
            need: {
              type: 'string',
              description: 'What content must be provided for this slot',
            },
            effort: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'How much work to produce the needed content',
            },
            rationale: {
              type: 'string',
              description:
                'Why this extension improves the prompt — conveys priority, impact, feasibility, and tradeoffs',
            },
            produces: {
              type: 'string',
              description:
                'What this extension contributes to downstream output quality, format, or behavior when applied and filled',
            },
          },
          required: [
            'id',
            'type',
            'placement',
            'preamble',
            'slot',
            'need',
            'effort',
            'rationale',
            'produces',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
};
