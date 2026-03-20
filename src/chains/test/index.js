import fs from 'node:fs/promises';
import llm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { testResultJsonSchema } from './schemas.js';
import { scopeOperation } from '../../lib/context/option.js';

export default async function test(path, instructions, config = {}) {
  config = scopeOperation('test', config);
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
          ...config,
          response_format: {
            type: 'json_schema',
            json_schema: testResultJsonSchema,
          },
        }),
      {
        label: 'test chain',
        config,
      }
    );

    // With structured output, we get a validated object
    return result.hasIssues ? result.issues : [];
  } catch (error) {
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
