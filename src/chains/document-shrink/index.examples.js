import { describe, it, expect } from 'vitest';
import documentShrink from './index.js';
import aiExpect from '../expect/index.js';
import fs from 'fs';
import path from 'path';

// Helper to show cache message after 5 seconds
function withCacheMessage(testFn) {
  return async (...args) => {
    let messageShown = false;
    const timer = setTimeout(() => {
      console.log(
        '\n⏳ This test may take up to 45 seconds on first run, but will be fast on subsequent runs due to caching.\n'
      );
      messageShown = true;
    }, 5000);

    try {
      const result = await testFn(...args);
      clearTimeout(timer);
      if (messageShown) {
        console.log('✅ Test completed. Future runs will use cached results.\n');
      }
      return result;
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  };
}

describe('document-shrink examples', () => {
  const samplesDir = path.join(process.cwd(), 'src/samples/txt');

  it(
    'reduces a long article about climate change to key points for a specific question',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const climateArticle = fs.readFileSync(
        path.join(samplesDir, 'climate-change-article.txt'),
        'utf8'
      );

      const query = 'What can individuals do to help with climate change?';

      const result = await documentShrink(climateArticle, query, {
        targetSize: 800,
        tokenBudget: 1000,
      });

      // Verify size reduction occurred
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThan(climateArticle.length);
      expect(result.content.length).toBeLessThanOrEqual(1000); // Some buffer

      // console.log('[Climate Change Test] Result length:', result.content.length);
      // console.log('[Climate Change Test] First 200 chars:', result.content.substring(0, 200));

      // Use AI to verify content relevance
      const isRelevantToQuery = await aiExpect(result.content).toSatisfy(
        `Contains information about climate change that could be relevant to understanding individual actions, even if it includes context about impacts, solutions, or general climate information`
      );
      expect(isRelevantToQuery).toBe(true);

      const maintainsCoherence = await aiExpect(result.content).toSatisfy(
        `The text contains coherent sections of content, even if separated by dividers like "---", and is not just random word fragments`
      );
      expect(maintainsCoherence).toBe(true);

      // Verify metadata
      expect(result.metadata.finalSize).toBeLessThanOrEqual(1000);
      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThan(0.5);
    })
  );

  it(
    'summarizes a technical manual to help troubleshoot a specific error',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const technicalManual = fs.readFileSync(
        path.join(samplesDir, 'technical-manual.txt'),
        'utf8'
      );

      const query = 'Why is my hub showing a flashing red light?';

      const result = await documentShrink(technicalManual, query, {
        targetSize: 600,
        tokenBudget: 800,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThan(technicalManual.length);

      // Use AI to verify troubleshooting content is preserved
      const includesTroubleshootingSteps = await aiExpect(result.content).toSatisfy(
        `Contains specific troubleshooting steps for fixing a flashing red light error on the Smart Home Hub, including possible causes and solutions`
      );
      expect(includesTroubleshootingSteps).toBe(true);

      const includesRelevantContext = await aiExpect(result.content).toSatisfy(
        `Includes LED indicator meanings to help understand what different light patterns mean, particularly the red light states`
      );
      expect(includesRelevantContext).toBe(true);

      const excludesIrrelevantSections = await aiExpect(result.content).toSatisfy(
        `Does not include warranty information, detailed specifications, or safety warnings, focusing instead on troubleshooting`
      );
      expect(excludesIrrelevantSections).toBe(true);

      expect(result.metadata.tokens.used).toBeLessThan(800);
    })
  );

  it(
    'extracts recipe instructions from a food blog post full of stories',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const foodBlog = fs.readFileSync(path.join(samplesDir, 'food-blog-cookies.txt'), 'utf8');

      const query = 'How do I make these chocolate chip cookies?';

      const result = await documentShrink(foodBlog, query, {
        targetSize: 700,
        tokenBudget: 800,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThan(foodBlog.length);

      // console.log('[Recipe Test] Result length:', result.content.length);
      // console.log('[Recipe Test] First 200 chars:', result.content.substring(0, 200));

      // Use AI to verify recipe extraction
      const hasRecipeInfo = await aiExpect(result.content).toSatisfy(
        `Contains information relevant to making chocolate chip cookies - may include ingredients, instructions, or baking tips`
      );
      expect(hasRecipeInfo).toBe(true);

      const isCoherent = await aiExpect(result.content).toSatisfy(
        `The text contains coherent sections about making cookies, even if separated by dividers`
      );
      expect(isCoherent).toBe(true);

      const reducedContent = await aiExpect(result.content).toSatisfy(
        `The content is shorter than a full blog post and focuses on recipe-related information, though it may include some tips and context`
      );
      expect(reducedContent).toBe(true);

      expect(parseFloat(result.metadata.reductionRatio)).toBeGreaterThan(0.5);
    })
  );

  it(
    'finds relevant legal clauses in a long contract',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const contract = fs.readFileSync(path.join(samplesDir, 'legal-contract.txt'), 'utf8');

      const query = 'What are the termination terms and fees?';

      const result = await documentShrink(contract, query, {
        targetSize: 800,
        tokenBudget: 900,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThan(contract.length);

      // console.log('[Legal Contract Test] Result length:', result.content.length);
      // console.log('[Legal Contract Test] First 200 chars:', result.content.substring(0, 200));

      // Use AI to verify legal content extraction
      const hasTerminationInfo = await aiExpect(result.content).toSatisfy(
        `Contains information about termination, cancellation, contract ending, or service agreement terms`
      );
      expect(hasTerminationInfo).toBe(true);

      const containsLegalProvisions = await aiExpect(result.content).toSatisfy(
        `Contains legal provisions, clauses, or agreement terms that would be found in a service contract`
      );
      expect(containsLegalProvisions).toBe(true);

      const focusedOnQuery = await aiExpect(result.content).toSatisfy(
        `The selected content is more focused on termination/cancellation aspects than unrelated contract sections`
      );
      expect(focusedOnQuery).toBe(true);

      // Check that it at least prioritizes termination content
      const prioritizesTermination = await aiExpect(result.content).toSatisfy(
        `The content includes termination-related information and doesn't consist entirely of unrelated clauses`
      );
      expect(prioritizesTermination).toBe(true);
    })
  );

  it(
    'extracts medication information from a dense medical document',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const medicalDoc = fs.readFileSync(path.join(samplesDir, 'medical-protocol.txt'), 'utf8');

      const query = 'What diabetes medications are available and what are their doses?';

      const result = await documentShrink(medicalDoc, query, {
        targetSize: 1000,
        tokenBudget: 1200,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThan(medicalDoc.length);

      // console.log('[Medical Doc Test] Result length:', result.content.length);
      // console.log('[Medical Doc Test] First 200 chars:', result.content.substring(0, 200));
      // console.log('[Medical Doc Test] Metadata:', result.metadata);

      // Use AI to verify medication information extraction
      const hasDiabetesContent = await aiExpect(result.content).toSatisfy(
        `Contains information about diabetes medications, treatments, or management`
      );
      expect(hasDiabetesContent).toBe(true);

      const hasMedicalInfo = await aiExpect(result.content).toSatisfy(
        `Contains medical information that could include drug names, dosing, or treatment protocols`
      );
      expect(hasMedicalInfo).toBe(true);

      const hasClinicalContext = await aiExpect(result.content).toSatisfy(
        `May include relevant clinical information such as when to use each medication, contraindications, or monitoring requirements`
      );
      expect(hasClinicalContext).toBe(true);

      const focusedContent = await aiExpect(result.content).toSatisfy(
        `The content is primarily focused on diabetes management and may include context necessary for understanding medications, even if some background information is present`
      );
      expect(focusedContent).toBe(true);

      expect(result.metadata.tokens.used).toBeLessThan(1200);
    })
  );

  it(
    'handles edge case of very aggressive reduction',
    { timeout: 45000 },
    withCacheMessage(async () => {
      const technicalManual = fs.readFileSync(
        path.join(samplesDir, 'technical-manual.txt'),
        'utf8'
      );

      const query = 'How do I connect to WiFi?';

      const result = await documentShrink(technicalManual, query, {
        targetSize: 200, // Very small target
        tokenBudget: 600,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeLessThanOrEqual(1200); // Allow buffer since chunks may be larger than target

      // console.log('[Edge Case Test] Result length:', result.content.length);
      // console.log('[Edge Case Test] Target was:', 200);
      // console.log('[Edge Case Test] Content:', result.content.substring(0, 300));
      // console.log('[Edge Case Test] Metadata:', result.metadata);

      // Use AI to verify some relevant information is preserved despite aggressive reduction
      const preservesEssentialInfo = await aiExpect(result.content).toSatisfy(
        `Contains some information about the Smart Home Hub or related technical content`
      );
      expect(preservesEssentialInfo).toBe(true);

      const maintainsCoherence = await aiExpect(result.content).toSatisfy(
        `The text remains coherent and understandable, not just random fragments`
      );
      expect(maintainsCoherence).toBe(true);
    })
  );
});
