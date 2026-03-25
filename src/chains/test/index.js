import fs from 'node:fs/promises';
import llm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { testResultJsonSchema } from './schemas.js';
import { track } from '../../lib/progress-callback/index.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'test';

export default async function test(path, instructions, config = {}) {
  const runConfig = nameStep(name, config);
  const span = track(name, runConfig);

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
          ...runConfig,
          response_format: jsonSchema(testResultJsonSchema.name, testResultJsonSchema.schema),
        }),
      {
        label: 'test chain',
        config: runConfig,
      }
    );

    // With structured output, we get a validated object
    const issues = result.hasIssues ? result.issues : [];

    span.result();

    return issues;
  } catch (error) {
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
