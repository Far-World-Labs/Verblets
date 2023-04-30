import fs from 'fs/promises';
import path from 'path';

import { errorRunningTests } from '../../constants/messages.js';
import chatGPT from '../../lib/chatgpt/index.js';
import {
  constants as promptConstants,
  wrapVariable,
} from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';
import toObject from '../../verblets/to-object/index.js';

const {
  contentIsExample,
  contentIsInstructions,
  noFalseInformation,
  onlyJSONArray,
  onlyJSONStringArray,
  useLineNumber,
} = promptConstants;

const contentIsChecksExamined =
  'These items were checked in an examination of the text:';
const contentIsExamined = 'The text examined:';
const findCodeImprovements =
  'Find specific improvements in the following code, not nitpicks.';
const gatherAsTestJSON =
  'Gather these discovered issues into a JSON format my tests module can consume.';

const testExamplesJSON = `[
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
]`;

const checksPrompt = (text, instructions) => `
${contentIsInstructions} ${wrapVariable(instructions)}

${wrapVariable(text, { tag: 'main-content' })}

${useLineNumber}
${noFalseInformation}

${onlyJSONStringArray}
`;

const testsPrompt = (text, instructions, checks) => `${onlyJSONArray}

${gatherAsTestJSON}

${contentIsChecksExamined} ${wrapVariable(checks)}

${contentIsExamined} ${wrapVariable(text, { tag: 'text-examined' })}

${contentIsExample} ${wrapVariable(testExamplesJSON, { tag: 'example' })}

${onlyJSONArray}
`;

export default async (
  filePath,
  instructions = findCodeImprovements,
  model = modelService.getBestAvailableModel()
) => {
  const enableRegex = new RegExp(process.env.ENABLE_AI_TESTS ?? '^$');
  if (!enableRegex.test(filePath)) {
    return [];
  }

  try {
    const filePathAbsolute = path.resolve(filePath);
    const text = await fs.readFile(filePathAbsolute, 'utf-8');

    const checksPromptCreated = checksPrompt(text, instructions);
    const checksBudget = model.budgetTokens(checksPromptCreated);

    const checksResult = await chatGPT(checksPromptCreated, {
      maxTokens: checksBudget.completion,
    });

    const testsPromptCreated = testsPrompt(text, instructions, checksResult);
    const testsBudget = model.budgetTokens(testsPromptCreated);

    const results = await toObject(
      await chatGPT(testsPromptCreated, { maxTokens: testsBudget.completion })
    );

    if (!results.length) {
      return [];
    }

    return results;
  } catch (error) {
    return [
      {
        name: errorRunningTests,
        expected: 'tests generated',
        saw: error.message,
      },
    ];
  }
};
