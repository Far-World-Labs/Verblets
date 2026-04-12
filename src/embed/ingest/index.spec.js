import { describe, it, expect, vi } from 'vitest';
import { normalize } from '../vector-ops/index.js';

// Mock embed-local before importing ingest
vi.mock('../local/index.js', () => {
  // Deterministic embeddings: hash text to axis-aligned vectors
  const hashToVec = (text) => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    const v = new Float32Array(4);
    v[Math.abs(h) % 4] = 1;
    // Add slight variation from second char hash
    v[(Math.abs(h) + 1) % 4] = 0.1 * ((h & 0xf) / 15);
    return v;
  };
  return {
    embed: vi.fn(async (text) => hashToVec(text)),
    embedBatch: vi.fn(async (texts) => texts.map(hashToVec)),
    embedImageBatch: vi.fn(async (inputs) => inputs.map((img) => hashToVec(`img:${img}`))),
  };
});

const { default: ingest } = await import('./index.js');

const schema = {
  projections: [
    { projectionName: 'billing', description: 'invoices and charges' },
    { projectionName: 'compliance', description: 'legal and policy' },
  ],
  properties: [
    {
      propertyName: 'urgency',
      valueRange: { type: 'continuous', low: 0, high: 1, lowLabel: 'calm', highLabel: 'critical' },
      projectionWeights: { billing: 0.5, compliance: 0.5 },
    },
  ],
};

describe('ingest', () => {
  it('builds states with per-projection vectors from fragments', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:1',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Invoice is wrong',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:1'],
          },
          {
            fragmentId: 'f2',
            text: 'Legal risk in retention',
            fragmentKind: 'literal',
            projectionName: 'compliance',
            sourceIds: ['ticket:1'],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states).toHaveLength(1);
    expect(states[0].stateId).toBe('ticket:1');
    expect(states[0].vectorsByProjectionName.billing).toBeInstanceOf(Float32Array);
    expect(states[0].vectorsByProjectionName.compliance).toBeInstanceOf(Float32Array);
  });

  it('pools multiple fragments per projection via mean', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:2',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'First billing issue',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:2'],
          },
          {
            fragmentId: 'f2',
            text: 'Second billing issue',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:2'],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states).toHaveLength(1);
    expect(states[0].vectorsByProjectionName.billing).toBeInstanceOf(Float32Array);
    // Pooled vector should be normalized
    const vec = states[0].vectorsByProjectionName.billing;
    const mag = Math.sqrt([...vec].reduce((s, v) => s + v * v, 0));
    expect(mag).toBeCloseTo(1, 3);
  });

  it('produces a baseVector from all fragments', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:3',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Billing text',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:3'],
          },
          {
            fragmentId: 'f2',
            text: 'Compliance text',
            fragmentKind: 'literal',
            projectionName: 'compliance',
            sourceIds: ['ticket:3'],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states[0].baseVector).toBeInstanceOf(Float32Array);
  });

  it('builds separate states for different sourceIds', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:4',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Billing A',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:A'],
          },
          {
            fragmentId: 'f2',
            text: 'Billing B',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:B'],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states).toHaveLength(2);
    const ids = states.map((s) => s.stateId).sort();
    expect(ids).toEqual(['ticket:A', 'ticket:B']);
  });

  it('deduplicates identical fragment texts in embedding batch', async () => {
    const { embedBatch } = await import('../local/index.js');
    embedBatch.mockClear();

    const fragmentSets = [
      {
        fragmentSetId: 'fs:5',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Same text',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:5'],
          },
          {
            fragmentId: 'f2',
            text: 'Same text',
            fragmentKind: 'recast',
            projectionName: 'compliance',
            sourceIds: ['ticket:5'],
          },
        ],
      },
    ];

    await ingest({ fragmentSets, schema });
    // embedBatch should receive only one unique text
    expect(embedBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it('enriches schema with _poles when missing', async () => {
    const { schema: enriched } = await ingest({
      fragmentSets: [
        {
          fragmentSetId: 'fs:6',
          fragments: [
            {
              fragmentId: 'f1',
              text: 'Something',
              fragmentKind: 'literal',
              projectionName: 'billing',
              sourceIds: ['ticket:6'],
            },
          ],
        },
      ],
      schema,
    });

    expect(enriched._poles).toBeDefined();
    expect(enriched._poles.urgency).toBeDefined();
    expect(enriched._poles.urgency.low).toBeInstanceOf(Float32Array);
    expect(enriched._poles.urgency.high).toBeInstanceOf(Float32Array);
  });

  it('preserves existing _poles and only embeds missing ones', async () => {
    const existingPoles = {
      urgency: {
        low: normalize(new Float32Array([1, 0, 0, 0])),
        high: normalize(new Float32Array([0, 1, 0, 0])),
      },
    };
    const schemaWithPoles = { ...schema, _poles: existingPoles };

    const { schema: enriched } = await ingest({
      fragmentSets: [
        {
          fragmentSetId: 'fs:7',
          fragments: [
            {
              fragmentId: 'f1',
              text: 'Text',
              fragmentKind: 'literal',
              projectionName: 'billing',
              sourceIds: ['ticket:7'],
            },
          ],
        },
      ],
      schema: schemaWithPoles,
    });

    // Should keep existing poles unchanged
    expect(enriched._poles.urgency.low).toBe(existingPoles.urgency.low);
  });

  it('does not mutate the input schema', async () => {
    await ingest({
      fragmentSets: [
        {
          fragmentSetId: 'fs:8',
          fragments: [
            {
              fragmentId: 'f1',
              text: 'Text',
              fragmentKind: 'literal',
              projectionName: 'billing',
              sourceIds: ['ticket:8'],
            },
          ],
        },
      ],
      schema,
    });
    expect(schema._poles).toBeUndefined();
  });

  it('uses fragmentSetId as stateId when sourceIds is empty', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:fallback',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'No source',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: [],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states[0].stateId).toBe('fs:fallback');
  });

  it('handles image fragments alongside text fragments', async () => {
    const fragmentSets = [
      {
        fragmentSetId: 'fs:mixed',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Invoice text',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:mixed'],
          },
          {
            fragmentId: 'f2',
            image: 'https://example.com/receipt.jpg',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:mixed'],
          },
        ],
      },
    ];

    const { states } = await ingest({ fragmentSets, schema });
    expect(states).toHaveLength(1);
    expect(states[0].stateId).toBe('ticket:mixed');
    expect(states[0].vectorsByProjectionName.billing).toBeInstanceOf(Float32Array);
  });

  it('calls embedImageBatch for image fragments', async () => {
    const { embedImageBatch } = await import('../local/index.js');
    embedImageBatch.mockClear();

    const fragmentSets = [
      {
        fragmentSetId: 'fs:img',
        fragments: [
          {
            fragmentId: 'f1',
            image: 'photo1.jpg',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:img'],
          },
          {
            fragmentId: 'f2',
            image: 'photo2.jpg',
            fragmentKind: 'literal',
            projectionName: 'compliance',
            sourceIds: ['ticket:img'],
          },
        ],
      },
    ];

    await ingest({ fragmentSets, schema });
    expect(embedImageBatch).toHaveBeenCalled();
    expect(embedImageBatch.mock.calls[0][0]).toEqual(['photo1.jpg', 'photo2.jpg']);
  });

  it('deduplicates identical image inputs', async () => {
    const { embedImageBatch } = await import('../local/index.js');
    embedImageBatch.mockClear();

    const fragmentSets = [
      {
        fragmentSetId: 'fs:dup-img',
        fragments: [
          {
            fragmentId: 'f1',
            image: 'same.jpg',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:dup'],
          },
          {
            fragmentId: 'f2',
            image: 'same.jpg',
            fragmentKind: 'recast',
            projectionName: 'compliance',
            sourceIds: ['ticket:dup'],
          },
        ],
      },
    ];

    await ingest({ fragmentSets, schema });
    expect(embedImageBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it('passes multi embedding config when images present', async () => {
    const { embedBatch } = await import('../local/index.js');
    embedBatch.mockClear();

    const fragmentSets = [
      {
        fragmentSetId: 'fs:multi-config',
        fragments: [
          {
            fragmentId: 'f1',
            text: 'Some text',
            fragmentKind: 'literal',
            projectionName: 'billing',
            sourceIds: ['ticket:mc'],
          },
          {
            fragmentId: 'f2',
            image: 'photo.jpg',
            fragmentKind: 'literal',
            projectionName: 'compliance',
            sourceIds: ['ticket:mc'],
          },
        ],
      },
    ];

    await ingest({ fragmentSets, schema });
    // embedBatch should receive config with embedding: { multi: true }
    const config = embedBatch.mock.calls[0][1];
    expect(config.embedding).toEqual({ multi: true });
  });
});
