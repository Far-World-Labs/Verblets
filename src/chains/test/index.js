import fs from 'node:fs/promises';
import llm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { testResultJsonSchema } from './schemas.js';
import { initChain } from '../../lib/context/option.js';
import { emitChainResult, emitChainError } from '../../lib/progress-callback/index.js';

const name = 'test';

export default async function test(path, instructions, config = {}) {
  ({ config } = await initChain(name, config));
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
          response_format: jsonSchema(testResultJsonSchema.name, testResultJsonSchema.schema),
        }),
      {
        label: 'test chain',
        config,
      }
    );

    // With structured output, we get a validated object
    const issues = result.hasIssues ? result.issues : [];

    emitChainResult(config, name);

    return issues;
  } catch (error) {
    emitChainError(config, name, error);
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
