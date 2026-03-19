import fs from 'node:fs/promises';
import llm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { testResultJsonSchema } from './schemas.js';
import { resolveAll, withOperation } from '../../lib/context/resolve.js';

export default async function test(path, instructions, options = {}) {
  options = withOperation('test', options);
  const {
    llm: llmConfig,
    maxAttempts,
    retryDelay,
    retryOnAll,
  } = await resolveAll(options, {
    llm: undefined,
    maxAttempts: 3,
    retryDelay: 1000,
    retryOnAll: false,
  });
  try {
    const code = await fs.readFile(path, 'utf-8');

    const prompt = `Analyze this code and ${instructions}:

${asXML(code, { tag: 'code-to-analyze' })}

Return a JSON object with:
- "hasIssues": boolean indicating if any issues were found
- "issues": array of strings, each describing a specific issue with actionable feedback

GUIDELINES:
- Focus only on issues related to the test criteria
- Provide specific line numbers or code references when possible
- Suggest concrete fixes for each issue identified
- Be concise but clear in your feedback
- If no issues are found, return {"hasIssues": false, "issues": []}`;

    const result = await retry(
      () =>
        llm(prompt, {
          ...options,
          llm: llmConfig,
          modelOptions: {
            ...options.modelOptions,
            response_format: {
              type: 'json_schema',
              json_schema: testResultJsonSchema,
            },
          },
        }),
      {
        label: 'test chain',
        maxAttempts,
        retryDelay,
        retryOnAll,
        onProgress: options.onProgress,
        abortSignal: options.abortSignal,
      }
    );

    // With structured output, we get a validated object
    return result.hasIssues ? result.issues : [];
  } catch (error) {
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
