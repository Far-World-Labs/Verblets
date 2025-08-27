import fs from 'node:fs/promises';
import path from 'node:path';
import {
  listFunctions,
  findCallees,
  traceCaller,
} from '../../../lib/parse-js-parts/function-utils.js';
import chatGPT from '../../../lib/chatgpt/index.js';
import score from '../../../chains/score/index.js';
import modelService from '../../../services/llm-model/index.js';
import { bold, cyan } from '../../../chains/test-analysis/output-utils.js';

const RELEVANCE_THRESHOLD = 0.3;
const MAX_CALLERS = 3;
const MAX_CALLER_LINES = 20;
const CONTEXT_PREVIEW_LENGTH = 500;
const PROMPT_USAGE_RATIO = 0.6;

const formatFunctionBlock = (func) => `\`\`\`javascript
${func.text}
\`\`\``;

const formatEntrypoint = (targetFunction) => `<entrypoint>
Function: ${targetFunction.name}
Type: ${targetFunction.type}
Lines: ${targetFunction.lineCount}
${formatFunctionBlock(targetFunction)}
</entrypoint>`;

const formatCallerSection = async (callers, rootDir) => {
  if (callers.length === 0) return '';

  const callerTexts = await Promise.all(
    callers.map(async (caller) => {
      const header = `- ${caller.functionName} in ${caller.file}`;

      const callerFile = path.join(rootDir, caller.file);
      const callerCode = await fs.readFile(callerFile, 'utf-8').catch(() => null);
      if (!callerCode) return header;

      const callerFunctions = listFunctions(callerCode, 0);
      const callerFunc = callerFunctions.find((f) => f.name === caller.functionName);

      if (!callerFunc || callerFunc.lineCount > MAX_CALLER_LINES) return header;

      return `${header}\n${formatFunctionBlock(callerFunc)}`;
    })
  );

  return `\n\n<callers>\n${callerTexts.join('\n')}\n</callers>`;
};

const scoreCallees = async (calleeFunctions, intent) => {
  if (calleeFunctions.length === 0) return [];

  // Create array of function descriptions for bulk scoring
  const functionDescriptions = calleeFunctions.map(
    (calleeFunc) =>
      `Function "${calleeFunc.name}": ${calleeFunc.text.slice(0, CONTEXT_PREVIEW_LENGTH)}`
  );

  // Score all functions at once
  const scores = await score(functionDescriptions, `Relevance to: ${intent}`);

  // Combine functions with their scores
  const scored = calleeFunctions.map((func, i) => ({
    ...func,
    relevance: scores[i],
  }));

  return scored
    .filter((c) => c.relevance >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.relevance - a.relevance);
};

const formatCalleeSection = (scoredCallees, budgetRemaining) => {
  if (scoredCallees.length === 0) return '';

  let prompt = '\n\n<callees>';
  let sizeUsed = 0;

  for (const callee of scoredCallees) {
    const calleeBlock = `\n\nFunction: ${callee.name} (relevance: ${callee.relevance.toFixed(2)})
${formatFunctionBlock(callee)}`;

    if (sizeUsed + calleeBlock.length > budgetRemaining) break;

    prompt += calleeBlock;
    sizeUsed += calleeBlock.length;
  }

  return `${prompt}\n</callees>`;
};

const findTargetFunction = (functions, functionName) =>
  functions.find((f) => f.name === functionName);

const collectCalleeFunctions = (callees, functions) =>
  callees.map((calleeName) => functions.find((f) => f.name === calleeName)).filter(Boolean);

/**
 * Analyze a specific function with AI, including context, callers, and callees
 */
export async function analyzeFunction(context, args = {}) {
  let { functionName, intent = 'Analyze this function' } = args;
  const { moduleDir } = context;

  // Debug: check what intent actually is
  if (typeof intent !== 'string') {
    console.error('Intent is not a string:', intent);
    // Extract string from object if possible
    intent = intent?.value || intent?.scoring || intent?.intent || 'Analyze this function';
  }

  if (!functionName) {
    return 'Function name is required for analysis';
  }

  const mainFile = path.join(moduleDir, 'index.js');
  const code = await fs.readFile(mainFile, 'utf-8').catch(() => null);

  if (!code) {
    return 'Failed to read module file';
  }

  const functions = listFunctions(code, 0);
  const targetFunction = findTargetFunction(functions, functionName);

  if (!targetFunction) {
    return `Function '${functionName}' not found in module`;
  }

  const rootDir = process.cwd();

  // Gather data in parallel
  const [callers, callees] = await Promise.all([
    traceCaller(rootDir, mainFile, functionName, MAX_CALLERS),
    Promise.resolve(findCallees(code, targetFunction.start, targetFunction.end)),
  ]);

  const calleeFunctions = collectCalleeFunctions(callees, functions);
  const scoredCallees = await scoreCallees(calleeFunctions, intent);

  // Build prompt sections
  const entrypointSection = formatEntrypoint(targetFunction);
  const callerSection = await formatCallerSection(callers, rootDir);

  // Calculate budget - get the default model's context window
  const defaultModel = modelService.getModel();
  const maxPromptSize = defaultModel.maxContextWindow * PROMPT_USAGE_RATIO;

  const basePrompt = entrypointSection + callerSection;
  const budgetRemaining = maxPromptSize - basePrompt.length;

  const calleeSection = formatCalleeSection(scoredCallees, budgetRemaining);
  const fullPrompt = basePrompt + calleeSection;

  const systemMessage = `You are a code analysis expert. Analyze the provided function.

Provide analysis as:
- Fragments (7-15 words)
- Use - for bullets
- No markdown

Cover these aspects (skip if not applicable):
- Purpose: what problem it solves
- Parameters: inputs and their types/roles
- Dataflow: how data transforms through the function
- Key decisions: conditionals, branches, validation
- Expensive calls: API calls, async operations, heavy computation
- Abstractions used: patterns, utilities, dependencies
- Responsibility: single concern or mixed
- Reuse: how generalizable/composable
- Output: return value and format
- Side effects: mutations, console, external state`;

  const userMessage = `${intent}\n\n${fullPrompt}`;

  // Analyze with AI - chatGPT takes a single prompt string, not messages
  // For system+user messages, we combine them into a single prompt
  const combinedPrompt = `${systemMessage}\n\n${userMessage}`;

  const analysis = await chatGPT(combinedPrompt);

  // Format the output - consistent with other handlers
  const header = bold(cyan('FUNCTION ANALYSIS'));

  // Indent the analysis content
  const analysisIndented = analysis
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');

  return `${header}

      Function: ${bold(functionName)}

${analysisIndented}

      ${bold('Metadata:')}
      - Line count: ${targetFunction.lineCount}
      - Callers found: ${callers.length}
      - Functions called: ${callees.length}
      - Relevant callees analyzed: ${scoredCallees.length}`;
}
