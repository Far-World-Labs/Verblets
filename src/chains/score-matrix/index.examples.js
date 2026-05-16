import { describe } from 'vitest';
import { longTestTimeout, isMediumBudget } from '../../constants/common.js';
import scoreMatrix from './index.js';
import score from '../score/index.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('score-matrix');

describe('score-matrix examples', () => {
  it(
    'evaluates research papers across orthogonal academic criteria',
    async () => {
      const abstracts = [
        'We prove that P != NP under a novel oracle separation framework, resolving a 50-year open question. Our proof introduces a new diagonal argument that extends to all relativizing techniques.',
        'We present a React component library for rendering pie charts with customizable colors. Our library supports 12 color themes and exports CommonJS and ESM bundles.',
        'We train a 7B parameter language model on multilingual code and prove formal convergence guarantees for the training objective. Evaluations on HumanEval show 92% pass@1, exceeding GPT-4 on 3 of 8 categories.',
      ];

      const rubric = [
        {
          dimension: 'novelty',
          description:
            'How fundamentally new is the contribution? Incremental improvements score low; paradigm shifts score high.',
        },
        {
          dimension: 'rigor',
          description:
            'Strength of evidence: formal proofs, statistical significance, reproducibility of results.',
        },
        {
          dimension: 'impact',
          description:
            'How many researchers or practitioners would change their work based on this paper?',
        },
      ];

      const result = await scoreMatrix(
        abstracts,
        rubric,
        'Score on a 0-10 scale. Be harsh — reserve 9-10 for exceptional work.'
      );

      expect(result.matrix).toHaveLength(abstracts.length);
      result.matrix.forEach((row) => {
        expect(row).toHaveLength(rubric.length);
        row.forEach((cell) => {
          expect(Number.isFinite(cell.score)).toBe(true);
          expect(cell.score).toBeGreaterThanOrEqual(result.scale.min);
          expect(cell.score).toBeLessThanOrEqual(result.scale.max);
          expect(cell.rationale.length).toBeGreaterThan(0);
        });
      });

      expect(result.dimensions).toEqual(['novelty', 'rigor', 'impact']);

      await aiExpect(result).toSatisfy(
        'the P!=NP paper scores highest on novelty and rigor; the pie chart library scores lowest across all dimensions; the ML paper scores well on impact but below the P!=NP paper on novelty'
      );

      const noveltyScores = result.matrix.map((row) => row[0].score);
      const impactScores = result.matrix.map((row) => row[2].score);
      await aiExpect({ noveltyScores, impactScores, abstracts }).toSatisfy(
        'novelty and impact rankings differ for at least one paper, demonstrating dimensional independence'
      );
    },
    longTestTimeout
  );

  it(
    'string rubric evaluates on a single dimension',
    async () => {
      const essays = [
        'The mitochondria is the powerhouse of the cell. It makes energy. Energy is important for life.',
        'Mitochondrial dysfunction drives neurodegeneration through impaired oxidative phosphorylation, excessive ROS production, and disrupted calcium homeostasis — a cascade that selectively targets high-energy-demand neurons in the substantia nigra.',
      ];

      const result = await scoreMatrix(
        essays,
        'Intellectual depth: does this demonstrate genuine understanding or just recite facts?'
      );

      expect(result.matrix).toHaveLength(2);
      expect(result.matrix[0]).toHaveLength(1);
      expect(result.dimensions).toEqual(['overall']);

      await aiExpect(result.matrix).toSatisfy(
        'the second essay about mitochondrial dysfunction scores substantially higher than the first, with rationales noting depth of mechanistic understanding vs surface-level recitation'
      );
    },
    longTestTimeout
  );

  it.skipIf(!isMediumBudget)(
    '[medium] composes with score for funnel evaluation: broad screen then detailed matrix',
    async () => {
      const candidates = [
        'Senior engineer, 12 years experience, built distributed systems at Google, open source contributor to Kubernetes',
        'Junior developer, bootcamp graduate, built a todo app and a weather app, enthusiastic about AI',
        'Staff architect, designed Netflix content delivery pipeline, published 3 systems papers, mentored 20+ engineers',
        'Mid-level developer, 4 years at a startup, full-stack React/Node, shipped 2 products to production',
        'Principal engineer, 18 years experience, database internals expert, PostgreSQL committer',
      ];

      const quickScores = await score(
        candidates,
        'Technical seniority for a staff-level systems role'
      );
      expect(quickScores).toHaveLength(candidates.length);

      const top3 = candidates
        .map((c, i) => ({ candidate: c, score: quickScores[i] ?? 0 }))
        .toSorted((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.candidate);

      const detailedRubric = [
        {
          dimension: 'systems_depth',
          description:
            'Evidence of designing and operating large-scale distributed systems under real production constraints',
        },
        {
          dimension: 'leadership',
          description:
            'Track record of mentorship, architectural decision-making, and cross-team influence',
        },
        {
          dimension: 'craft',
          description:
            'Commitment to engineering excellence: open source, publications, tooling contributions',
        },
      ];

      const result = await scoreMatrix(top3, detailedRubric);

      expect(result.matrix).toHaveLength(3);
      result.matrix.forEach((row) => {
        expect(row).toHaveLength(3);
        row.forEach((cell) => {
          expect(Number.isFinite(cell.score)).toBe(true);
          expect(cell.rationale.length).toBeGreaterThan(0);
        });
      });

      await aiExpect({ top3, result }).toSatisfy(
        'the detailed matrix reveals differentiation the quick score missed: e.g. the PostgreSQL committer may score highest on craft but lower on leadership, while the Netflix architect scores highest on systems_depth'
      );
    },
    longTestTimeout
  );

  it(
    'empty items returns empty matrix without LLM call',
    async () => {
      const rubric = [
        { dimension: 'quality', description: 'Overall quality' },
        { dimension: 'clarity', description: 'Clarity of expression' },
      ];

      const result = await scoreMatrix([], rubric);

      expect(result.matrix).toEqual([]);
      expect(result.dimensions).toEqual(['quality', 'clarity']);
      expect(result.scale.min).toBe(0);
      expect(result.scale.max).toBe(10);
    },
    longTestTimeout
  );

  it(
    'rejects invalid rubrics before any LLM call',
    async () => {
      await expect(scoreMatrix(['item'], [])).rejects.toThrow(/rubric/);
      await expect(
        scoreMatrix(['item'], [{ description: 'missing dimension field' }])
      ).rejects.toThrow(/dimension/);
      await expect(scoreMatrix(['item'], '')).rejects.toThrow(/rubric/);
    },
    longTestTimeout
  );
});
