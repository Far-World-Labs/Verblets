import fs from 'node:fs/promises';
import llm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { testResultJsonSchema } from './schemas.js';
import createProgressEmitter from '../../lib/progress/index.js';
import { Outcome, DomainEvent } from '../../lib/progress/constants.js';
import { nameStep } from '../../lib/context/option.js';
import { resolveArgs, resolveTexts } from '../../lib/instruction/index.js';

const name = 'test';

async function test(path, instructions, config) {
  [instructions, config] = resolveArgs(instructions, config);
  const { text, context } = resolveTexts(instructions, []);
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    const code = await fs.readFile(path, 'utf-8');
    emitter.emit({ event: DomainEvent.phase, phase: 'file-read', path });

    const contextBlock = context ? `\n\n${context}` : '';
    const prompt = `Analyze this code and ${text}:

${asXML(code, { tag: 'code-to-analyze' })}

Return a JSON object with:
- "hasIssues": boolean indicating if any issues were found
- "issues": array of strings, each describing a specific issue with actionable feedback

GUIDELINES:
- Focus only on issues related to the test criteria
- Provide specific line numbers or code references when possible
- Suggest concrete fixes for each issue identified
- Be concise but clear in your feedback
- If no issues are found, return {"hasIssues": false, "issues": []}${contextBlock}`;

    emitter.emit({ event: DomainEvent.phase, phase: 'analyzing' });

    const result = await retry(
      () =>
        llm(prompt, {
          ...runConfig,
          responseFormat: jsonSchema(testResultJsonSchema.name, testResultJsonSchema.schema),
        }),
      {
        label: 'test chain',
        config: runConfig,
      }
    );

    const issues = result.hasIssues ? result.issues : [];
    emitter.emit({
      event: DomainEvent.phase,
      phase: 'analysis-complete',
      issueCount: issues.length,
    });

    emitter.complete({ outcome: Outcome.success });

    return issues;
  } catch (error) {
    emitter.error(error);
    throw error;
  }
}

test.knownTexts = [];

export default test;
