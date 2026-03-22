import { describe, it, expect } from 'vitest';
import { createContextBuilder } from './builder.js';

describe('context builder', () => {
  describe('createContextBuilder', () => {
    it('creates a builder with no initial context', () => {
      const builder = createContextBuilder();
      const ctx = builder.build();
      expect(ctx).toEqual({});
    });
  });

  describe('setApplication', () => {
    it('stores application kind with default key', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production', version: '1.0.0' });
      const ctx = builder.build();
      expect(ctx.application).toEqual({
        key: 'default',
        environment: 'production',
        version: '1.0.0',
      });
    });

    it('allows custom key', () => {
      const builder = createContextBuilder();
      builder.setApplication({ key: 'my-app', environment: 'test' });
      const ctx = builder.build();
      expect(ctx.application.key).toBe('my-app');
    });

    it('returns the builder for chaining', () => {
      const builder = createContextBuilder();
      const result = builder.setApplication({ environment: 'test' });
      expect(result).toBe(builder);
    });
  });

  describe('setProviders', () => {
    it('stores providers kind with default key', () => {
      const builder = createContextBuilder();
      builder.setProviders({ openai: true, anthropic: false });
      const ctx = builder.build();
      expect(ctx.providers).toEqual({
        key: 'default',
        openai: true,
        anthropic: false,
      });
    });

    it('returns the builder for chaining', () => {
      const builder = createContextBuilder();
      const result = builder.setProviders({ openai: true });
      expect(result).toBe(builder);
    });
  });

  describe('withRequest', () => {
    it('returns a new builder with request kind', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });
      const derived = builder.withRequest({ domain: 'medical', compliance: 'hipaa' });
      expect(derived).not.toBe(builder);
    });

    it('does not mutate the original builder', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });
      builder.withRequest({ domain: 'medical' });
      const ctx = builder.build();
      expect(ctx.request).toBeUndefined();
    });

    it('carries forward long-lived kinds', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });
      builder.setProviders({ openai: true });
      const derived = builder.withRequest({ domain: 'financial' });
      const ctx = derived.build();
      expect(ctx.application.environment).toBe('production');
      expect(ctx.providers.openai).toBe(true);
      expect(ctx.request.domain).toBe('financial');
    });

    it('sets default key on request kind', () => {
      const builder = createContextBuilder();
      const ctx = builder.withRequest({ domain: 'legal' }).build();
      expect(ctx.request.key).toBe('default');
    });
  });

  describe('withContent', () => {
    it('returns a new builder with content kind', () => {
      const builder = createContextBuilder();
      const derived = builder.withContent({ flagged: true, language: 'en' });
      expect(derived).not.toBe(builder);
    });

    it('does not mutate the original builder', () => {
      const builder = createContextBuilder();
      builder.withContent({ flagged: true });
      const ctx = builder.build();
      expect(ctx.content).toBeUndefined();
    });

    it('copies arrays in content kind', () => {
      const categories = ['medical-record', 'ssn'];
      const builder = createContextBuilder();
      const ctx = builder.withContent({ categories }).build();
      expect(ctx.content.categories).toEqual(['medical-record', 'ssn']);
      expect(ctx.content.categories).not.toBe(categories);
    });
  });

  describe('build', () => {
    it('produces a frozen snapshot', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'test' });
      const ctx = builder.build();
      expect(Object.isFrozen(ctx)).toBe(true);
      expect(Object.isFrozen(ctx.application)).toBe(true);
    });

    it('freezes nested arrays', () => {
      const builder = createContextBuilder();
      const ctx = builder
        .withContent({
          categories: ['pii-name', 'contact-email'],
        })
        .build();
      expect(Object.isFrozen(ctx.content.categories)).toBe(true);
    });

    it('omits unset kinds from snapshot', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'test' });
      const ctx = builder.build();
      expect(Object.keys(ctx)).toEqual(['application']);
    });

    it('produces independent snapshots from the same builder', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'test' });
      const ctx1 = builder.build();
      builder.setApplication({ environment: 'production' });
      const ctx2 = builder.build();
      expect(ctx1.application.environment).toBe('test');
      expect(ctx2.application.environment).toBe('production');
    });
  });

  describe('full chain', () => {
    it('accumulates all four kinds', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production', version: '2.0.0' }).setProviders({
        openai: true,
        anthropic: true,
        openwebui: false,
        embeddingAvailable: false,
        redisConfigured: true,
      });

      const ctx = builder
        .withRequest({
          domain: 'medical',
          compliance: 'hipaa',
          qualityIntent: 'critical',
          costPosture: 'normal',
          chain: 'entities',
        })
        .withContent({
          language: 'en',
          flagged: true,
          categories: ['medical-record', 'pii-name'],
        })
        .build();

      expect(ctx.application.environment).toBe('production');
      expect(ctx.application.version).toBe('2.0.0');
      expect(ctx.providers.openai).toBe(true);
      expect(ctx.request.domain).toBe('medical');
      expect(ctx.request.compliance).toBe('hipaa');
      expect(ctx.request.chain).toBe('entities');
      expect(ctx.content.flagged).toBe(true);
      expect(ctx.content.categories).toEqual(['medical-record', 'pii-name']);
    });
  });

  describe('isolation', () => {
    it('setApplication after withRequest does not affect derived builder', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });
      const derived = builder.withRequest({ domain: 'medical' });
      builder.setApplication({ environment: 'test' });

      const originalCtx = builder.build();
      const derivedCtx = derived.build();
      expect(originalCtx.application.environment).toBe('test');
      expect(derivedCtx.application.environment).toBe('production');
    });

    it('multiple withRequest calls from same builder are independent', () => {
      const builder = createContextBuilder();
      builder.setApplication({ environment: 'production' });

      const medical = builder.withRequest({ domain: 'medical' });
      const financial = builder.withRequest({ domain: 'financial' });

      expect(medical.build().request.domain).toBe('medical');
      expect(financial.build().request.domain).toBe('financial');
    });

    it('withContent on derived builder does not affect request-only builder', () => {
      const builder = createContextBuilder();
      const reqBuilder = builder.withRequest({ domain: 'legal' });
      const fullBuilder = reqBuilder.withContent({ flagged: true });

      expect(reqBuilder.build().content).toBeUndefined();
      expect(fullBuilder.build().content.flagged).toBe(true);
    });
  });
});
