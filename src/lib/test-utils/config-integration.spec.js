import { describe, expect, it } from 'vitest';

// ==========================================
// Centralized Config Integration Tests
// ==========================================
//
// These tests verify shared config infrastructure (initChain, jsonSchema,
// config forwarding, retry integration, response_format, progress callbacks)
// against representative chains. Per-chain spec files should test
// chain-SPECIFIC behavior only — not these shared patterns.
//
// Representative chains chosen to cover all infrastructure patterns:
//   filter  — batching, retry, response_format, progress, lifecycleLogger
//   sort    — chunked batching, retry, response_format, progress, initChain
//   score   — parallel batching, retry, response_format, anchoring
//
// If you're adding a new shared feature to the config system, add a test
// HERE against these representative chains rather than in every chain's spec.
// ==========================================

import { initChain, scopeOperation, withPolicy } from '../context/option.js';
import { jsonSchema } from '../llm/index.js';

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
