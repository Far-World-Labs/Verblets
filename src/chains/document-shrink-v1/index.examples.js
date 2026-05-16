import { describe } from 'vitest';
import documentShrink from './index.js';
import fs from 'node:fs';
import path from 'node:path';
import { isMediumBudget } from '../../constants/common.js'; // standard: 2-4 LLM calls per test
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Document shrink chain');

describe.skipIf(!isMediumBudget)('[medium] document-shrink examples', () => {
  const samplesDir = path.join(process.cwd(), 'src/samples/txt');

  it('reduces a climate article to answer a specific question', { timeout: 45000 }, async () => {
    const climateArticle = fs.readFileSync(
      path.join(samplesDir, 'climate-change-article.txt'),
      'utf8'
    );

    const result = await documentShrink(
      climateArticle,
      'What can individuals do to help with climate change?',
      { targetSize: 800, tokenBudget: 1000 }
    );

    expect(result.content.length).toBeLessThan(climateArticle.length);
    expect(result.metadata.finalSize).toBeLessThanOrEqual(1000);
    expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThan(0.5);

    await aiExpect(result.content).toSatisfy(
      'Contains information about climate change relevant to individual actions, impacts, or solutions'
    );
  });

  it('extracts recipe from a story-heavy food blog', { timeout: 45000 }, async () => {
    const foodBlog = fs.readFileSync(path.join(samplesDir, 'food-blog-cookies.txt'), 'utf8');

    const result = await documentShrink(foodBlog, 'How do I make these chocolate chip cookies?', {
      targetSize: 700,
      tokenBudget: 800,
    });

    expect(result.content.length).toBeLessThan(foodBlog.length);
    expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThan(0.5);

    await aiExpect(result.content).toSatisfy(
      'Contains cookie recipe information — ingredients, instructions, or baking tips — not blog storytelling'
    );
  });

  it('handles aggressive reduction without losing coherence', { timeout: 45000 }, async () => {
    const technicalManual = fs.readFileSync(path.join(samplesDir, 'technical-manual.txt'), 'utf8');

    const result = await documentShrink(technicalManual, 'How do I connect to WiFi?', {
      targetSize: 200,
      tokenBudget: 600,
    });

    expect(result.content.length).toBeLessThanOrEqual(1200);

    await aiExpect(result.content).toSatisfy(
      'Coherent text about a Smart Home Hub or WiFi connectivity — not random fragments'
    );
  });
});
