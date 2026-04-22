import { beforeEach, describe, expect, it, vi } from 'vitest';
import pipelineChain, { validatePipeline } from './index.js';
import { ChainEvent, DomainEvent, Outcome } from '../../lib/progress/constants.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// --- helpers ---

function fakeChain(name, fn) {
  const chain = async (input, instructions, config = {}) => fn(input, instructions, config);
  chain.knownTexts = [];
  return chain;
}

const toUpperChain = fakeChain('to-upper', async (items) => items.map((s) => s.toUpperCase()));

const joinChain = fakeChain('join', async (items, instructions) =>
  items.join(instructions ?? ', ')
);

// --- tests ---

describe('validatePipeline', () => {
  it('throws when steps array is empty', () => {
    expect(() => validatePipeline([])).toThrow('Pipeline requires at least one step');
  });

  it('throws when steps is not an array', () => {
    expect(() => validatePipeline('nope')).toThrow('Pipeline requires at least one step');
  });

  it('throws when a step has neither chain nor transform', () => {
    expect(() => validatePipeline([{ inputType: 'array', outputType: 'array' }])).toThrow(
      'Each step must have a "chain" or "transform" property'
    );
  });

  it('throws when inputType is missing', () => {
    expect(() => validatePipeline([{ chain: toUpperChain, outputType: 'array' }])).toThrow(
      'missing inputType'
    );
  });

  it('throws when outputType is missing', () => {
    expect(() => validatePipeline([{ chain: toUpperChain, inputType: 'array' }])).toThrow(
      'missing outputType'
    );
  });

  it('throws TypeError on type mismatch between adjacent steps', () => {
    expect(() =>
      validatePipeline([
        { chain: toUpperChain, inputType: 'array', outputType: 'array' },
        { chain: joinChain, inputType: 'string', outputType: 'string' },
      ])
    ).toThrow(TypeError);
  });

  it('includes step indices and type names in mismatch error', () => {
    expect(() =>
      validatePipeline([
        { chain: toUpperChain, inputType: 'array', outputType: 'array', name: 'upper' },
        { chain: joinChain, inputType: 'string', outputType: 'string', name: 'join' },
      ])
    ).toThrow(/step 0.*"upper".*step 1.*"join".*"array".*"string"/i);
  });

  it('accepts a valid single-step pipeline', () => {
    expect(() =>
      validatePipeline([{ chain: toUpperChain, inputType: 'array', outputType: 'array' }])
    ).not.toThrow();
  });

  it('accepts a valid multi-step pipeline with matching types', () => {
    expect(() =>
      validatePipeline([
        { chain: toUpperChain, inputType: 'array', outputType: 'array' },
        { chain: joinChain, inputType: 'array', outputType: 'string' },
      ])
    ).not.toThrow();
  });
});

describe('pipelineChain', () => {
  describe('sequential composition', () => {
    it('runs a single chain step', async () => {
      const result = await pipelineChain(
        ['hello', 'world'],
        [{ chain: toUpperChain, inputType: 'array', outputType: 'array' }]
      );
      expect(result).toStrictEqual(['HELLO', 'WORLD']);
    });

    it('chains two chain steps sequentially', async () => {
      const result = await pipelineChain(
        ['a', 'b', 'c'],
        [
          { chain: toUpperChain, inputType: 'array', outputType: 'array' },
          { chain: joinChain, instructions: '-', inputType: 'array', outputType: 'string' },
        ]
      );
      expect(result).toBe('A-B-C');
    });

    it('passes instructions to chain steps', async () => {
      const instructionSpy = vi.fn(async (input, instructions) => input + instructions);
      const result = await pipelineChain('hello ', [
        {
          chain: instructionSpy,
          instructions: 'world',
          inputType: 'string',
          outputType: 'string',
        },
      ]);
      expect(result).toBe('hello world');
      expect(instructionSpy).toHaveBeenCalledWith(
        'hello ',
        'world',
        expect.objectContaining({ operation: expect.any(String) })
      );
    });

    it('runs transform steps as pure functions', async () => {
      const result = await pipelineChain(
        ['a', 'b', 'c'],
        [
          {
            transform: (items) => items.map((s) => s.toUpperCase()),
            inputType: 'array',
            outputType: 'array',
          },
          { transform: (items) => items.join(', '), inputType: 'array', outputType: 'string' },
        ]
      );
      expect(result).toBe('A, B, C');
    });

    it('interleaves chain and transform steps', async () => {
      const result = await pipelineChain(
        ['hello', 'world'],
        [
          { chain: toUpperChain, inputType: 'array', outputType: 'array' },
          { transform: (items) => items.reverse(), inputType: 'array', outputType: 'array' },
          { chain: joinChain, instructions: ' ', inputType: 'array', outputType: 'string' },
        ]
      );
      expect(result).toBe('WORLD HELLO');
    });

    it('handles async transform steps', async () => {
      const asyncTransform = async (items) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return items.filter((s) => s.length > 1);
      };

      const result = await pipelineChain(
        ['a', 'bb', 'c', 'dd'],
        [
          { transform: asyncTransform, inputType: 'array', outputType: 'array' },
          { chain: toUpperChain, inputType: 'array', outputType: 'array' },
        ]
      );
      expect(result).toStrictEqual(['BB', 'DD']);
    });
  });

  describe('type mismatch detection', () => {
    it('throws TypeError before executing any steps on composition mismatch', async () => {
      const spy = vi.fn(async (v) => v);
      await expect(
        pipelineChain(
          ['a'],
          [
            { chain: spy, inputType: 'array', outputType: 'string' },
            { chain: spy, inputType: 'array', outputType: 'array' },
          ]
        )
      ).rejects.toThrow(TypeError);
      expect(spy).not.toHaveBeenCalled();
    });

    it('throws TypeError at runtime when a step produces the wrong type', async () => {
      const liarChain = async () => 'not-an-array';

      await expect(
        pipelineChain(
          ['a'],
          [{ chain: liarChain, inputType: 'array', outputType: 'array', name: 'liar' }]
        )
      ).rejects.toThrow(/Step 0.*"liar".*produced "string".*declared.*"array"/);
    });

    it('includes step name in runtime type error when provided', async () => {
      const badTransform = () => 42;

      await expect(
        pipelineChain('hello', [
          { transform: badTransform, inputType: 'string', outputType: 'string', name: 'bad-step' },
        ])
      ).rejects.toThrow(/bad-step/);
    });
  });

  describe('progress emission', () => {
    it('emits chain:start and chain:complete', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      await pipelineChain(
        ['a', 'b'],
        [{ chain: toUpperChain, inputType: 'array', outputType: 'array' }],
        { onProgress }
      );

      const startEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === ChainEvent.start
      );
      expect(startEvent).toBeDefined();

      const completeEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.totalSteps).toBe(1);
      expect(completeEvent.outcome).toBe(Outcome.success);
    });

    it('emits input and output domain events', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      await pipelineChain(
        ['x'],
        [{ chain: toUpperChain, inputType: 'array', outputType: 'array' }],
        { onProgress }
      );

      const inputEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === DomainEvent.input
      );
      expect(inputEvent).toBeDefined();
      expect(inputEvent.value).toStrictEqual(['x']);

      const outputEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === DomainEvent.output
      );
      expect(outputEvent).toBeDefined();
      expect(outputEvent.value).toStrictEqual(['X']);
    });

    it('emits step events for each pipeline step', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      await pipelineChain(
        ['a'],
        [
          { chain: toUpperChain, inputType: 'array', outputType: 'array', name: 'upper' },
          { chain: joinChain, inputType: 'array', outputType: 'string', name: 'join' },
        ],
        { onProgress }
      );

      const stepEvents = events.filter(
        (e) => e.step === 'pipeline-chain' && e.event === DomainEvent.step
      );
      expect(stepEvents).toHaveLength(2);
      expect(stepEvents[0].stepIndex).toBe(0);
      expect(stepEvents[0].stepName).toBe('upper');
      expect(stepEvents[1].stepIndex).toBe(1);
      expect(stepEvents[1].stepName).toBe('join');
    });

    it('tracks batch progress across steps', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      await pipelineChain(
        ['a', 'b'],
        [
          { chain: toUpperChain, inputType: 'array', outputType: 'array' },
          { chain: joinChain, inputType: 'array', outputType: 'string' },
          { transform: (s) => s.toLowerCase(), inputType: 'string', outputType: 'string' },
        ],
        { onProgress }
      );

      const batchEvents = events.filter(
        (e) => e.step === 'pipeline-chain' && e.event === 'batch:complete'
      );
      expect(batchEvents).toHaveLength(3);
      expect(batchEvents[0].processedItems).toBe(1);
      expect(batchEvents[1].processedItems).toBe(2);
      expect(batchEvents[2].processedItems).toBe(3);
      expect(batchEvents[2].totalItems).toBe(3);
    });

    it('scopes sub-chain progress with phase prefix', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      const progressAwareChain = async (input, _instructions, config = {}) => {
        if (config.onProgress) {
          config.onProgress({ step: 'inner', event: 'working' });
        }
        return input;
      };

      await pipelineChain(
        ['a'],
        [{ chain: progressAwareChain, inputType: 'array', outputType: 'array', name: 'aware' }],
        { onProgress }
      );

      const innerEvent = events.find((e) => e.step === 'inner' && e.event === 'working');
      expect(innerEvent).toBeDefined();
      expect(innerEvent.phase).toBe('pipeline:aware');
    });

    it('emits chain:error on failure', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));
      const failingChain = async () => {
        throw new Error('boom');
      };

      await expect(
        pipelineChain(['a'], [{ chain: failingChain, inputType: 'array', outputType: 'array' }], {
          onProgress,
        })
      ).rejects.toThrow('boom');

      const errorEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === ChainEvent.error
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.message).toBe('boom');
    });
  });

  describe('error handling in intermediate transforms', () => {
    it('propagates errors from transform steps', async () => {
      const failingTransform = () => {
        throw new Error('transform failed');
      };

      await expect(
        pipelineChain(
          ['a'],
          [
            { chain: toUpperChain, inputType: 'array', outputType: 'array' },
            { transform: failingTransform, inputType: 'array', outputType: 'array' },
          ]
        )
      ).rejects.toThrow('transform failed');
    });

    it('propagates errors from chain steps', async () => {
      const failingChain = async () => {
        throw new Error('chain failed');
      };

      await expect(
        pipelineChain(['a'], [{ chain: failingChain, inputType: 'array', outputType: 'string' }])
      ).rejects.toThrow('chain failed');
    });

    it('does not execute subsequent steps after a failure', async () => {
      const secondStep = vi.fn(async (v) => v);
      const failingTransform = () => {
        throw new Error('early fail');
      };

      await expect(
        pipelineChain(
          ['a'],
          [
            { transform: failingTransform, inputType: 'array', outputType: 'array' },
            { chain: secondStep, inputType: 'array', outputType: 'array' },
          ]
        )
      ).rejects.toThrow('early fail');

      expect(secondStep).not.toHaveBeenCalled();
    });

    it('emits error event with proper metadata on transform failure', async () => {
      const events = [];
      const onProgress = vi.fn((event) => events.push(event));

      await expect(
        pipelineChain(
          'hello',
          [
            {
              transform: () => {
                throw new Error('oops');
              },
              inputType: 'string',
              outputType: 'string',
            },
          ],
          { onProgress }
        )
      ).rejects.toThrow('oops');

      const errorEvent = events.find(
        (e) => e.step === 'pipeline-chain' && e.event === ChainEvent.error
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.type).toBe('Error');
    });
  });

  describe('config threading', () => {
    it('passes scoped runConfig to chain steps', async () => {
      const configCapture = vi.fn(async (input, _instructions, _config) => {
        return input;
      });

      await pipelineChain(
        ['a'],
        [{ chain: configCapture, inputType: 'array', outputType: 'array' }],
        { customOption: 42 }
      );

      expect(configCapture).toHaveBeenCalledWith(
        ['a'],
        undefined,
        expect.objectContaining({
          customOption: 42,
          operation: expect.stringContaining('pipeline-chain'),
        })
      );
    });
  });
});
