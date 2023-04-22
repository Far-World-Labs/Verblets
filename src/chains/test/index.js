import fs from 'fs/promises';
import path from 'path';

import chatGPT, { list } from '../../index.js';
import budgetTokens from '../../lib/budget-tokens/index.js';
import {
  wrapVariable,
} from '../../prompts/fragment-functions/index.js'
import {
  onlyJSONArray,
  onlyJSONStringArray,
} from '../../prompts/fragment-texts/index.js'
import toObject from '../../verblets/to-object/index.js';

const performChecksPrompt = (text, instructions) => `
Instructions: ${wrapVariable(instructions)}

\`\`\`
${text}
\`\`\`

Include the line number where each check is performed.
Do not include false information.

${onlyJSONStringArray}
`;

const outputForTestsPrompt = (text, instructions, checks) => `${onlyJSONArray}

Gather these discovered issues into a JSON format my tests module can consume.

These items were checked in an examination of the text:
${wrapVariable(checks)}

The text examined:
\`\`\`
${text}
\`\`\`

Use this as example output only. Follow the structure exactly:
\`\`\`
[
  {
    name: '<copied from the supplied checks>',
    expected: '<what you expected to see, your rationale for the change, give suggestions here, abbreviate to < 100 characters>',
    saw: '<what you saw, being specific about where you see it, abbreviate to < 100 characters>',
    isSuccess: false,
  },
  {
    name: '<copied from the supplied checks>',
    expected: '<what you expected to see, your rationale for the change, give suggestions here, abbreviate to < 100 characters>',
    saw: '<what you saw, being specific about where you see it, abbreviate to < 100 characters>',
    isSuccess: true,
  },
  <many more>
]
\`\`\`

${onlyJSONArray}
`;

export default async (
  filePath,
  instructions='Find specific improvements in the following code, not nitpicks.'
) => {
  const enableRegex = new RegExp(process.env.ENABLE_AI_TESTS ?? '^$');
  if (!enableRegex.test(filePath)) {
    return [];
  }

  try {
    const filePathAbsolute = path.resolve(filePath);
    const text = await fs.readFile(filePathAbsolute, 'utf-8');

    const performChecksPromptCreated = performChecksPrompt(text, instructions);
    const budget = budgetPrompt(performChecksPromptCreated);

    const checksResult = await chatGPT(
      performChecksPromptCreated,
      { maxTokens: budget.completion }
    );

    const outputForTestsPromptCreated = outputForTestsPrompt(text, instructions, checksResult);
    const budget = budgetPrompt(outputForTestsPromptCreated);

    const results = await toObject(await chatGPT(
      outputForTestsPromptCreated,
      { maxTokens: budget.completion }
    ));

    if (!results.length) {
      return [];
    }

    return results;
  } catch (error) {
    return [{
      name: 'Error running AI tests',
      expected: 'tests generated',
      saw: error.message
    }];
  }
};
