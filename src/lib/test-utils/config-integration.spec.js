import { describe, expect, it } from 'vitest';

// ==========================================
// Centralized Config Infrastructure Tests
// ==========================================
//
// Tests for shared config infrastructure (initChain, jsonSchema, withPolicy,
// scopeOperation). Per-chain spec files test chain-SPECIFIC behavior only.
// ==========================================

import { getOption, initChain, scopeOperation, withPolicy } from '../context/option.js';
import { jsonSchema, MODEL_KEYS } from '../llm/index.js';
import { CAPABILITY_KEYS } from '../../constants/common.js';

describe('initChain', () => {
  it('combines scopeOperation and getOptions', async () => {
    const { config, batchSize } = await initChain('test-chain', {}, { batchSize: 10 });
    expect(config.evalContext.operation).toBe('test-chain');
    expect(config.now).toBeInstanceOf(Date);
    expect(batchSize).toBe(10);
  });

  it('composes operation names hierarchically', async () => {
    const parent = scopeOperation('parent', {});
    const { config } = await initChain('child', parent, {});
    expect(config.evalContext.operation).toBe('parent/child');
  });

  it('resolves withPolicy options', async () => {
    const mapper = (v) => ({ a: `${v ?? 'default'}-mapped` });
    const { config, a } = await initChain(
      'test',
      {},
      {
        myOption: withPolicy(mapper, ['a']),
      }
    );
    expect(a).toBe('default-mapped');
    expect(config.evalContext.operation).toBe('test');
  });

  it('resolves policy functions from config.policy', async () => {
    const policy = { batchSize: () => 42 };
    const { batchSize } = await initChain('test', { policy }, { batchSize: 10 });
    expect(batchSize).toBe(42);
  });

  it('returns config without spec when spec is omitted', async () => {
    const { config } = await initChain('test', { foo: 'bar' });
    expect(config.evalContext.operation).toBe('test');
    expect(config.foo).toBe('bar');
  });
});

describe('MODEL_KEYS and CAPABILITY_KEYS resolution via getOption', () => {
  // callLlm resolves each MODEL_KEY and CAPABILITY_KEY via getOption(key, options, undefined).
  // These tests verify the contract that policy functions can control LLM-level parameters
  // per-operation, which is the foundation for behavioral policy.

  it('resolves temperature from policy per operation', async () => {
    const config = scopeOperation('hot-chain', {
      policy: {
        temperature: (ctx) => (ctx.operation === 'hot-chain' ? 0.9 : 0.1),
      },
    });
    const temp = await getOption('temperature', config, undefined);
    expect(temp).toBe(0.9);
  });

  it('resolves temperature from flat config when no policy', async () => {
    const temp = await getOption('temperature', { temperature: 0.5 }, undefined);
    expect(temp).toBe(0.5);
  });

  it('policy takes precedence over flat config for MODEL_KEYS', async () => {
    const config = {
      temperature: 0.3,
      policy: { temperature: () => 0.9 },
    };
    const temp = await getOption('temperature', config, undefined);
    expect(temp).toBe(0.9);
  });

  it('resolves capability keys from policy', async () => {
    const config = scopeOperation('cheap-path', {
      policy: {
        fast: (ctx) => ctx.operation === 'cheap-path',
        cheap: () => true,
      },
    });
    const fast = await getOption('fast', config, undefined);
    const cheap = await getOption('cheap', config, undefined);
    expect(fast).toBe(true);
    expect(cheap).toBe(true);
  });

  it('nested operation scoping affects MODEL_KEY resolution', async () => {
    const parent = scopeOperation('parent', {
      policy: {
        temperature: (ctx) =>
          ctx.operation === 'parent/score' ? 0.0 : ctx.operation === 'parent' ? 0.7 : undefined,
      },
    });
    const child = scopeOperation('score', parent);

    const parentTemp = await getOption('temperature', parent, undefined);
    const childTemp = await getOption('temperature', child, undefined);
    expect(parentTemp).toBe(0.7);
    expect(childTemp).toBe(0.0);
  });

  it('all MODEL_KEYS are resolvable via getOption', async () => {
    const policyValues = Object.fromEntries(MODEL_KEYS.map((k, i) => [k, () => `val-${i}`]));
    const config = { policy: policyValues };
    for (let i = 0; i < MODEL_KEYS.length; i++) {
      const val = await getOption(MODEL_KEYS[i], config, undefined);
      expect(val).toBe(`val-${i}`);
    }
  });

  it('all CAPABILITY_KEYS are resolvable via getOption', async () => {
    const policyValues = Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, () => true]));
    const config = { policy: policyValues };
    for (const key of CAPABILITY_KEYS) {
      const val = await getOption(key, config, undefined);
      expect(val).toBe(true);
    }
  });
});

describe('jsonSchema', () => {
  it('wraps schema in response_format envelope', () => {
    const schema = { type: 'object', properties: { value: { type: 'string' } } };
    const result = jsonSchema('test_schema', schema);
    expect(result).toEqual({
      type: 'json_schema',
      json_schema: { name: 'test_schema', schema },
    });
  });
});
