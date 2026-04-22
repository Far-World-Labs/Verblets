import { beforeEach, describe, expect, it, vi } from 'vitest';
import argumentMap from './index.js';
import { ChainEvent, DomainEvent } from '../../lib/progress/constants.js';

const SAMPLE_TEXT = `Remote work increases productivity because employees save commuting time and can work in comfortable environments. A Stanford study found a 13% performance increase among remote workers. However, critics argue that remote work reduces spontaneous collaboration, which is essential for innovation. Additionally, managers report difficulty in assessing employee engagement without in-person interaction. Some companies like GitLab have demonstrated that fully remote teams can innovate effectively through asynchronous communication practices.`;

const POLICY_TEXT = `Raising the minimum wage to $15/hour will reduce poverty by increasing disposable income for low-wage workers. The Congressional Budget Office estimates that 900,000 people would be lifted out of poverty. Opponents contend that higher labor costs will lead businesses to cut jobs, potentially eliminating 1.4 million positions. Small business owners particularly argue they cannot absorb the increased costs without raising prices, which would disproportionately affect the consumers the policy aims to help.`;

function makeMockClaims(text) {
  if (/Remote work/.test(text)) {
    return {
      claims: [
        {
          id: 'c1',
          statement: 'Remote work increases productivity',
          type: 'causal',
          confidence: 'moderate',
        },
        {
          id: 'c2',
          statement: 'Employees save commuting time working remotely',
          type: 'factual',
          confidence: 'strong',
        },
      ],
      evidence: [
        {
          claimId: 'c1',
          content: 'Stanford study found 13% performance increase among remote workers',
          type: 'empirical',
          strength: 'strong',
        },
        {
          claimId: 'c1',
          content: 'Employees can work in comfortable environments',
          type: 'logical',
          strength: 'moderate',
        },
      ],
      counterarguments: [
        {
          targetClaimId: 'c1',
          statement: 'Remote work reduces spontaneous collaboration essential for innovation',
          type: 'undercutter',
          strength: 'moderate',
        },
        {
          targetClaimId: 'c1',
          statement: 'Managers report difficulty assessing employee engagement remotely',
          type: 'rebuttal',
          strength: 'weak',
        },
      ],
    };
  }
  if (/minimum wage/.test(text)) {
    return {
      claims: [
        {
          id: 'c1',
          statement: 'Raising minimum wage to $15/hour will reduce poverty',
          type: 'causal',
          confidence: 'moderate',
        },
        {
          id: 'c2',
          statement: 'Higher labor costs will lead to job cuts',
          type: 'causal',
          confidence: 'moderate',
        },
      ],
      evidence: [
        {
          claimId: 'c1',
          content: 'CBO estimates 900,000 people would be lifted out of poverty',
          type: 'statistical',
          strength: 'strong',
        },
      ],
      counterarguments: [
        {
          targetClaimId: 'c1',
          statement: 'Higher labor costs could eliminate 1.4 million positions',
          type: 'rebuttal',
          strength: 'strong',
        },
        {
          targetClaimId: 'c1',
          statement: 'Price increases would disproportionately affect target consumers',
          type: 'undercutter',
          strength: 'moderate',
        },
      ],
    };
  }
  return { claims: [], evidence: [], counterarguments: [] };
}

vi.mock('../../lib/llm/index.js', () => ({
  default: vi.fn().mockImplementation((text) => makeMockClaims(text)),
  jsonSchema: (name, schema) => ({ type: 'json_schema', json_schema: { name, schema } }),
}));

vi.mock('../../lib/retry/index.js', () => ({
  default: vi.fn(async (fn) => fn()),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('argument-map', () => {
  it('extracts claims, evidence, and counterarguments from text', async () => {
    const result = await argumentMap(SAMPLE_TEXT, 'Analyze the argument structure');

    expect(result.claims).toHaveLength(2);
    expect(result.evidence).toHaveLength(2);
    expect(result.counterarguments).toHaveLength(2);

    const firstClaim = result.claims[0];
    expect(firstClaim).toHaveProperty('id', 'c1');
    expect(firstClaim).toHaveProperty('statement');
    expect(firstClaim).toHaveProperty('type');
    expect(firstClaim).toHaveProperty('confidence');
    expect(firstClaim.statement).toMatch(/Remote work/);
  });

  it('links evidence to claims via claimId', async () => {
    const result = await argumentMap(SAMPLE_TEXT);

    const claimIds = new Set(result.claims.map((c) => c.id));
    for (const ev of result.evidence) {
      expect(claimIds.has(ev.claimId)).toBe(true);
    }
  });

  it('links counterarguments to claims via targetClaimId', async () => {
    const result = await argumentMap(SAMPLE_TEXT);

    const claimIds = new Set(result.claims.map((c) => c.id));
    for (const ca of result.counterarguments) {
      expect(claimIds.has(ca.targetClaimId)).toBe(true);
    }
  });

  it('classifies claim types using valid enum values', async () => {
    const result = await argumentMap(SAMPLE_TEXT);
    const validTypes = ['factual', 'evaluative', 'causal', 'prescriptive', 'definitional'];

    for (const claim of result.claims) {
      expect(validTypes).toContain(claim.type);
    }
  });

  it('classifies evidence types using valid enum values', async () => {
    const result = await argumentMap(SAMPLE_TEXT);
    const validTypes = ['empirical', 'logical', 'testimonial', 'analogical', 'statistical'];

    for (const ev of result.evidence) {
      expect(validTypes).toContain(ev.type);
    }
  });

  it('classifies counterargument types using valid enum values', async () => {
    const result = await argumentMap(SAMPLE_TEXT);
    const validTypes = ['rebuttal', 'undercutter', 'alternative'];

    for (const ca of result.counterarguments) {
      expect(validTypes).toContain(ca.type);
    }
  });

  it('rates strength using valid enum values', async () => {
    const result = await argumentMap(SAMPLE_TEXT);
    const validStrengths = ['strong', 'moderate', 'weak'];

    for (const ev of result.evidence) {
      expect(validStrengths).toContain(ev.strength);
    }
    for (const ca of result.counterarguments) {
      expect(validStrengths).toContain(ca.strength);
    }
    for (const claim of result.claims) {
      expect(validStrengths).toContain(claim.confidence);
    }
  });

  it('accepts text and instructions as positional arguments', async () => {
    const { default: callLlm } = await import('../../lib/llm/index.js');

    await argumentMap(SAMPLE_TEXT, 'Focus on causal claims only');

    expect(callLlm).toHaveBeenCalledTimes(1);
    const promptArg = callLlm.mock.calls[0][0];
    expect(promptArg).toContain('Focus on causal claims only');
    expect(promptArg).toContain('Remote work');
  });

  it('accepts config as second argument when instructions are omitted', async () => {
    const { default: callLlm } = await import('../../lib/llm/index.js');

    await argumentMap(SAMPLE_TEXT, { depth: 'low' });

    expect(callLlm).toHaveBeenCalledTimes(1);
    const promptArg = callLlm.mock.calls[0][0];
    expect(promptArg).toContain('up to 5 primary claims');
  });

  it('respects depth option for controlling analysis granularity', async () => {
    const { default: callLlm } = await import('../../lib/llm/index.js');

    await argumentMap(SAMPLE_TEXT, 'Analyze', { depth: 'high' });

    const promptArg = callLlm.mock.calls[0][0];
    expect(promptArg).toContain('up to 20 primary claims');
    expect(promptArg).toContain('up to 5 pieces of supporting evidence');
  });

  it('uses instruction normalization for object-form instructions', async () => {
    const { default: callLlm } = await import('../../lib/llm/index.js');

    await argumentMap(SAMPLE_TEXT, {
      text: 'Analyze economic arguments',
      audience: 'policy makers',
    });

    const promptArg = callLlm.mock.calls[0][0];
    expect(promptArg).toContain('Analyze economic arguments');
    expect(promptArg).toContain('<audience>');
    expect(promptArg).toContain('policy makers');
  });

  it('handles known instruction keys without leaking them into context XML', async () => {
    const { default: callLlm } = await import('../../lib/llm/index.js');

    await argumentMap(SAMPLE_TEXT, {
      text: 'Analyze',
      focus: 'economic impact',
    });

    const promptArg = callLlm.mock.calls[0][0];
    expect(promptArg).not.toContain('<focus>');
  });

  describe('error handling', () => {
    it('propagates LLM errors through the emitter', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');
      callLlm.mockRejectedValueOnce(new Error('LLM unavailable'));

      const progressEvents = [];
      const onProgress = (event) => progressEvents.push(event);

      await expect(argumentMap(SAMPLE_TEXT, 'Analyze', { onProgress })).rejects.toThrow(
        'LLM unavailable'
      );

      const errorEvent = progressEvents.find((e) => e.event === ChainEvent.error);
      expect(errorEvent).toBeDefined();
    });

    it('returns empty arrays when LLM returns malformed response', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');
      callLlm.mockResolvedValueOnce({ unexpected: 'shape' });

      const result = await argumentMap(SAMPLE_TEXT);

      expect(result.claims).toEqual([]);
      expect(result.evidence).toEqual([]);
      expect(result.counterarguments).toEqual([]);
    });
  });

  describe('progress events', () => {
    it('emits start, input, output, and complete events', async () => {
      const progressEvents = [];
      const onProgress = (event) => progressEvents.push(event);

      await argumentMap(SAMPLE_TEXT, 'Analyze', { onProgress });

      const startEvent = progressEvents.find(
        (e) => e.step === 'argument-map' && e.event === ChainEvent.start
      );
      expect(startEvent).toBeDefined();

      const inputEvent = progressEvents.find(
        (e) => e.step === 'argument-map' && e.event === DomainEvent.input
      );
      expect(inputEvent).toBeDefined();
      expect(inputEvent.value).toBe(SAMPLE_TEXT);

      const outputEvent = progressEvents.find(
        (e) => e.step === 'argument-map' && e.event === DomainEvent.output
      );
      expect(outputEvent).toBeDefined();
      expect(outputEvent.value).toHaveProperty('claims');

      const completeEvent = progressEvents.find(
        (e) => e.step === 'argument-map' && e.event === ChainEvent.complete
      );
      expect(completeEvent).toBeDefined();
      expect(completeEvent.claimCount).toBe(2);
      expect(completeEvent.evidenceCount).toBe(2);
      expect(completeEvent.counterargumentCount).toBe(2);
    });
  });

  describe('integration with lib/instruction', () => {
    it('resolveTexts normalizes string instructions', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');

      await argumentMap(SAMPLE_TEXT, 'Focus on empirical evidence');

      const promptArg = callLlm.mock.calls[0][0];
      expect(promptArg).toContain('Focus on empirical evidence');
    });

    it('resolveTexts passes unknown keys as XML context', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');

      await argumentMap(SAMPLE_TEXT, {
        text: 'Analyze',
        domain: 'economics',
        methodology: 'Toulmin model',
      });

      const promptArg = callLlm.mock.calls[0][0];
      expect(promptArg).toContain('<domain>');
      expect(promptArg).toContain('economics');
      expect(promptArg).toContain('<methodology>');
      expect(promptArg).toContain('Toulmin model');
    });
  });

  describe('integration with lib/llm', () => {
    it('passes responseFormat with JSON schema to callLlm', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');

      await argumentMap(SAMPLE_TEXT);

      const configArg = callLlm.mock.calls[0][1];
      expect(configArg.responseFormat).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'argument_map_result',
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              claims: expect.any(Object),
              evidence: expect.any(Object),
              counterarguments: expect.any(Object),
            }),
          }),
        },
      });
    });

    it('passes operation context through to callLlm', async () => {
      const { default: callLlm } = await import('../../lib/llm/index.js');

      await argumentMap(SAMPLE_TEXT, 'Analyze', { llm: { good: true, reasoning: true } });

      const configArg = callLlm.mock.calls[0][1];
      expect(configArg.operation).toBe('argument-map');
      expect(configArg.llm).toEqual({ good: true, reasoning: true });
    });
  });

  describe('real-world argument analysis', () => {
    it('analyzes policy debate text with competing claims', async () => {
      const result = await argumentMap(
        POLICY_TEXT,
        'Identify the central policy claim and its strongest opposition'
      );

      expect(result.claims.length).toBeGreaterThan(0);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.counterarguments.length).toBeGreaterThan(0);

      const hasCausalClaim = result.claims.some((c) => c.type === 'causal');
      expect(hasCausalClaim).toBe(true);

      const hasStatisticalEvidence = result.evidence.some((e) => e.type === 'statistical');
      expect(hasStatisticalEvidence).toBe(true);
    });
  });
});
