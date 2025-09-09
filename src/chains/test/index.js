import fs from 'node:fs/promises';
import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { asJSON } from '../../prompts/constants.js';
import { testResultJsonSchema } from './schemas.js';

export default async function test(path, instructions, options = {}) {
  const { maxAttempts = 3, onProgress, ...restOptions } = options;
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
- If no issues are found, return {"hasIssues": false, "issues": []}

${asJSON}`;

    const result = await retry(
      () =>
        chatGPT(prompt, {
          ...restOptions,
          modelOptions: {
            ...restOptions.modelOptions,
            response_format: {
              type: 'json_schema',
              json_schema: testResultJsonSchema,
            },
          },
        }),
      { maxAttempts, onProgress, label: 'test chain' }
    );

    // With structured output, we get a validated object
    return result.hasIssues ? result.issues : [];
  } catch (error) {
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
