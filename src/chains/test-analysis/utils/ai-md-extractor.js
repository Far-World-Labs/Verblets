/**
 * AI.md Extractor
 * Uses LLM to intelligently extract sections from AI.md files
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';
import chatGPT from '../../../lib/chatgpt/index.js';
import retry from '../../../lib/retry/index.js';
import aiMdExtractionSchema from '../schemas/ai-md-extraction.json';

const EXTRACTION_PROMPT = `AI.md is a convention for informing AI processing of various details we're concerned with, including areas of focus, things we're actively working on, focuses of analysis when displaying AI tests, places that are in need of repair or break easily, and various levels of overview for quick analysis.

Extract the test focus intents and reference modules from this AI.md file.

For test focus intents: Extract each bullet point from the "Test Focus" section as a separate string. These represent the specific analysis tasks the AI should perform on this module.
For reference modules: Extract each module path from the "Reference Modules" section as a separate string. These are additional modules that should be loaded and analyzed alongside the main module.

If a section doesn't exist, return an empty array for it.

AI.md content:
<content>
{content}
</content>`;

export async function extractAIMdConfig(moduleDir) {
  const aiMdPath = join(moduleDir, 'AI.md');

  // Check if file exists
  try {
    await access(aiMdPath, constants.R_OK);
  } catch {
    return {
      intents: [],
      referenceModules: [],
      hasAIGuide: false,
    };
  }

  const content = await readFile(aiMdPath, 'utf-8');

  try {
    const prompt = EXTRACTION_PROMPT.replace('{content}', content);

    const response = await retry(
      () =>
        chatGPT(prompt, {
          modelOptions: {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'ai_md_extraction',
                schema: aiMdExtractionSchema,
              },
            },
          },
        }),
      { maxRetries: 2, label: 'AI.md extractor' }
    );

    const parsed = typeof response === 'string' ? JSON.parse(response) : response;

    return {
      intents: parsed.testFocusIntents || [],
      referenceModules: parsed.referenceModules || [],
      hasAIGuide: true,
      aiMdContent: content,
    };
  } catch (error) {
    console.error('Failed to extract AI.md config:', error.message);
    return {
      intents: [],
      referenceModules: [],
      hasAIGuide: true,
      aiMdContent: content,
    };
  }
}
