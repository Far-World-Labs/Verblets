import { describe, expect as vitestExpect, it as vitestIt } from 'vitest';
import depersonalize, {
  depersonalizeSpec,
  applyDepersonalize,
  createDepersonalizer,
} from './index.js';
import vitestAiExpect from '../expect/index.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';
import { extendedTestTimeout } from '../../constants/common.js';
import { models } from '../../constants/model-mappings.js';
import { get as configGet } from '../../lib/config/index.js';

const skipSensitivity = configGet('SENSITIVITY_TEST_SKIP') || !models.sensitive;

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Depersonalize chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Depersonalize chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Depersonalize chain' } })
  : vitestAiExpect;

const distinctiveEssay = `Look, here's the thing about distributed systems — they're basically
a house of cards held together by hope and TCP handshakes. I've been wrangling microservices
for fifteen years, and let me tell you, every "simple" service mesh turns into a Lovecraftian
horror show by month six. The trick? Embrace the chaos. Treat every network call like it's
going to betray you, because honestly, it probably will. My old mentor at Bell Labs used to
say "if your system works perfectly in staging, you haven't tested it." Wise words from a
woman who once debugged a race condition with a oscilloscope and sheer spite.`;

describe('Depersonalize examples', () => {
  it.skipIf(skipSensitivity)(
    'balanced depersonalization: remove authorial voice while preserving technical content',
    { timeout: extendedTestTimeout },
    async () => {
      const result = await depersonalize(distinctiveEssay, { method: 'balanced' });

      expect(result.text).toBeDefined();
      expect(result.stages).toHaveProperty('distinctiveContentRemoved');
      expect(result.stages).toHaveProperty('structureNormalized');

      await aiExpect(result.text).toSatisfy(
        'a neutral, impersonal discussion of distributed systems and microservices that preserves technical concepts but removes personal anecdotes, colloquialisms, and distinctive voice'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'strict depersonalization: maximize authorial fingerprint removal',
    { timeout: extendedTestTimeout },
    async () => {
      const opinionPiece = `Frankly, the state of JavaScript frameworks is an absolute circus.
Every six months some hotshot developer drops a new "revolutionary" approach that's really
just dependency injection with extra steps. I remember when jQuery was king — those were
simpler times, my friends. Now we've got hydration strategies, server components, and
signal-based reactivity fighting for mindshare. Call me old-fashioned, but sometimes a
simple script tag is all you need.`;

      const result = await depersonalize(opinionPiece, { method: 'strict' });

      expect(result.stages).toHaveProperty('distinctiveContentRemoved');
      expect(result.stages).toHaveProperty('structureNormalized');
      expect(result.stages).toHaveProperty('patternsSuppressed');

      await aiExpect(result.text).toSatisfy(
        'a generic, system-generated-sounding summary of JavaScript framework evolution that contains no personal opinions, emotional language, or distinctive writing style'
      );
    }
  );

  it.skipIf(skipSensitivity)(
    'spec/apply pattern: generate academic context rules then apply to multiple texts',
    { timeout: extendedTestTimeout },
    async () => {
      const spec = await depersonalizeSpec(
        'Academic peer review context: remove authorial fingerprints from reviewer comments while preserving technical critiques. Keep mathematical notation and citation references intact. Remove hedging language and personal qualifications.'
      );

      expect(spec).toHaveProperty('method');
      expect(spec).toHaveProperty('preservationRules');
      expect(spec).toHaveProperty('removalTargets');

      const reviews = [
        `I must say, the authors' approach to gradient clipping is quite clever — reminds me
of the Pascanu et al. (2013) trick but with a novel twist. However, their claim in eq. (7)
that convergence holds for all alpha > 0 strikes me as overly optimistic. In my experience
with similar bounds, you really need alpha in (0, 1/L) for the proof to go through.`,
        `Speaking as someone who's spent a decade in NLP, this paper's tokenization strategy
feels like a step backward. The BPE variant they propose (Section 3.2) doesn't account for
morphologically rich languages — I've seen this exact pitfall in my own work on Turkish NER.
That said, their Table 4 results on English benchmarks are undeniably strong.`,
      ];

      const results = await Promise.all(reviews.map((review) => applyDepersonalize(review, spec)));

      for (const result of results) {
        expect(result.text).toBeDefined();
        await aiExpect(result.text).toSatisfy(
          'a depersonalized academic review that preserves technical critiques, equation references, and citation numbers, but removes personal voice, hedging, and experience-based qualifications'
        );
      }
    }
  );

  it.skipIf(skipSensitivity)(
    'createDepersonalizer: reusable factory for whistleblower document processing',
    { timeout: extendedTestTimeout },
    async () => {
      const spec = await depersonalizeSpec(
        'Whistleblower document protection: aggressively remove all writing style markers, regional expressions, and domain-specific jargon that could identify the author. Preserve factual claims and evidence references.'
      );

      const depersonalizer = createDepersonalizer(spec);
      expect(depersonalizer.specification).toBe(spec);

      const result = await depersonalizer(
        `Y'all need to know what's happening in Building 7. Every Tuesday night after the
cleaning crew leaves, the hazmat team rolls in with unmarked drums — I counted fourteen
last week. As a facilities manager with twenty years in industrial compliance, I can tell
you those containers ain't up to code. The manifest logs in the basement office (third
filing cabinet from the left, bottom drawer) show discrepancies going back to Q2 2023.`
      );

      await aiExpect(result.text).toSatisfy(
        'a neutrally worded report about hazardous material handling concerns that preserves specific factual details (building number, container counts, dates, document locations) but removes all regional dialect, personal qualifications, and distinctive voice'
      );
    }
  );
});
