/**
 * Details Processor
 *
 * Analyzes detailed logs from verblets and chains to provide comprehensive test diagnostics.
 * Only activates when running individual tests with -t filter.
 */

import { BaseProcessor } from './base-processor.js';
import { getConfig } from '../config.js';
import { extractCodeWindow } from '../../../lib/code-extractor/index.js';
// import summaryMap from '../../summary-map/index.js'; // Unused - will be used for multi-pass context
import chatGPT from '../../../lib/chatgpt/index.js';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { gray, yellow, dim, bold, badges } from '../output-utils.js';

// ────────────────────────────────────────
// Pure functions
// ────────────────────────────────────────

const hasTestFilter = () => {
  const args = process.argv;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-t' || args[i] === '--testNamePattern') {
      return true;
    }
  }
  return false;
};

const hasSuiteFilter = () => {
  const args = process.argv;
  const hasTest = args.includes('-t') || args.includes('--testNamePattern');
  const hasFile = args.some((arg) => arg.includes('.js') || arg.includes('.ts'));
  return hasFile && !hasTest;
};

const getTestKey = (event) => `${event.suite}:${event.testIndex}`;

const isVerbletLog = (event) => {
  if (!event.event) return false;
  return (
    event.event.includes('bool:') ||
    event.event.includes('verblet:') ||
    event.event.includes('chain:')
  );
};

// ────────────────────────────────────────
// ViewModels
// ────────────────────────────────────────

const groupLogsByType = (logs) => ({
  input: logs.filter((l) => l.event?.includes(':input')),
  output: logs.filter((l) => l.event?.includes(':output')),
  llm: logs.filter((l) => l.event?.includes(':llm:')),
  timing: logs.filter((l) => l.event?.includes(':timing:')),
  errors: logs.filter((l) => l.event?.includes(':error')),
  decisions: logs.filter((l) => l.event?.includes(':decision')),
  interpretations: logs.filter((l) => l.event?.includes(':interpretation')),
});

const calculateTimings = (logs) => {
  const startLog = logs.find((l) => l.event?.includes(':start'));
  const endLog = logs.find((l) => l.event?.includes(':complete'));

  if (!startLog || !endLog) return undefined;

  const llmLogs = logs.filter((l) => l.event?.includes(':llm:'));
  // const llmStart = llmLogs.find((l) => l.event.includes('start')); // Unused
  const llmEnd = llmLogs.find((l) => l.event.includes('end'));

  return {
    total: endLog.totalElapsed || 0,
    llm: llmEnd?.duration || 0,
    overhead: (endLog.totalElapsed || 0) - (llmEnd?.duration || 0),
  };
};

const buildTestViewModel = (event, logs, fileContents) => {
  const inputLog = logs.find((l) => l.event === 'bool:input');
  const outputLog = logs.find((l) => l.event === 'bool:output');
  const testStart = logs.find((l) => l.event === 'test-start');

  return {
    test: {
      suite: event.suite,
      name: event.testName,
      passed: event.state === 'pass',
      file: testStart?.file || event.file,
    },
    input: inputLog
      ? {
          full: inputLog.full,
          type: inputLog.type,
          length: inputLog.length,
        }
      : undefined,
    output: outputLog
      ? {
          full: outputLog.full,
          type: outputLog.type,
          value: outputLog.value,
        }
      : undefined,
    logs: groupLogsByType(logs),
    timings: calculateTimings(logs),
    files: fileContents,
    totalLogs: logs.length,
  };
};

// Load AI.md if it exists in the module directory
const loadAIGuide = async (testFile) => {
  if (!testFile) return undefined;

  try {
    // Get the directory of the test file (assumes test is in module directory)
    const moduleDir = dirname(testFile);
    const aiMdPath = join(moduleDir, 'AI.md');

    const content = await readFile(aiMdPath, 'utf-8');
    return content;
  } catch {
    // AI.md is optional, so silently return undefined if not found
    return undefined;
  }
};

// Simple LLM analysis
const analyzeWithLLM = async (viewModel) => {
  // Count LLM calls
  const llmCalls = viewModel.logs.llm?.filter((l) => l.event.includes('start')).length || 0;

  // Get model details
  const llmStart = viewModel.logs.llm?.find((l) => l.event.includes('start'));
  const actualModel = llmStart?.model || 'unknown';

  // Calculate timing stats
  const llmTimings =
    viewModel.logs.llm?.filter((l) => l.event.includes('end')).map((l) => l.duration) || [];
  const avgLLMTime =
    llmTimings.length > 0
      ? Math.round(llmTimings.reduce((a, b) => a + b, 0) / llmTimings.length)
      : 0;

  // Build a detailed context for analysis
  const context = [
    'Test Execution Details:',
    `Test: ${viewModel.test.name}`,
    `Suite: ${viewModel.test.suite}`,
    '',
    'Input/Output:',
    `Input: "${viewModel.input?.full || 'none'}"`,
    `Output: ${viewModel.output?.full || 'none'} (type: ${viewModel.output?.value || 'unknown'})`,
    '',
    'LLM Usage:',
    `  Number of LLM calls: ${llmCalls}`,
    `  Model used: ${actualModel}`,
    `  Prompt size: ${llmStart?.promptLength || 0} chars`,
    '',
    'Performance Stats:',
    `  Total execution: ${viewModel.timings?.total || 0}ms`,
    `  LLM time: ${viewModel.timings?.llm || 0}ms (avg: ${avgLLMTime}ms per call)`,
    `  Overhead: ${viewModel.timings?.overhead || 0}ms`,
    `  LLM percentage: ${
      viewModel.timings?.total
        ? Math.round((viewModel.timings.llm / viewModel.timings.total) * 100)
        : 0
    }%`,
    '',
    'Processing Steps:',
  ];

  // Add interpretation details if available
  if (viewModel.logs.interpretations?.length > 0) {
    viewModel.logs.interpretations.forEach((log) => {
      context.push(`  Raw response: "${log.raw}" → interpreted as: ${log.decision}`);
    });
  }

  const contextStr = context.join('\n');

  // Try to load AI.md from the module directory
  const aiGuide = await loadAIGuide(viewModel.test?.file);

  // Build the prompt with optional AI guide
  let prompt = '';

  if (aiGuide) {
    prompt = `Analyze this test execution and provide operational insights.

<ai_guide>
Note: The following AI.md guide is provided by the module developer. Use it as supplementary context if relevant, but base your analysis primarily on the actual test data.

${aiGuide}
</ai_guide>

${contextStr}`;
  } else {
    prompt = `Analyze this test execution and provide operational insights.

${contextStr}`;
  }

  prompt += `

${contextStr}



Provide a brief analysis focusing on:
1. How the module transformed the input into the output
2. Any notable aspects of the execution (timing, processing steps)
3. What this tells us about how the module operates

Important: Include this exact line in your response with the actual output value:
OUTPUT_DISPLAY: The verblet returned {{OUTPUT}} for this question.

Replace {{OUTPUT}} with the actual output value from the test.

Keep the analysis to 2-3 sentences plus the OUTPUT_DISPLAY line.`;

  try {
    const analysis = await chatGPT(prompt);
    // Replace the template with actual output
    return analysis.replace('{{OUTPUT}}', viewModel.output?.full || 'undefined');
  } catch {
    return undefined;
  }
};

// ────────────────────────────────────────
// Display functions
// ────────────────────────────────────────

const renderTestHeader = (name, passed) => {
  console.log('');
  const status = passed ? badges.pass() : badges.test();
  console.log(`${status}  ${name}`);
  console.log(dim('  ──────────────────────────────────────'));
};

const renderInput = (input) => {
  if (!input) return;
  console.log('');
  console.log('  Input:');
  console.log(gray(`  ${input.full}`));
};

const renderOutput = (output) => {
  if (!output) return;
  console.log('');
  console.log('  Output:');
  console.log(`  ${output.full}${output.value !== undefined ? gray(` (${output.value})`) : ''}`);
};

const renderLLMLogs = (llmLogs) => {
  if (!llmLogs || llmLogs.length === 0) return;

  // Count LLM calls and get model info
  const llmStarts = llmLogs.filter((l) => l.event.includes('start'));
  const llmEnds = llmLogs.filter((l) => l.event.includes('end'));
  const numCalls = llmStarts.length;
  const model = llmStarts[0]?.model || 'unknown';

  console.log('');
  console.log(gray('  LLM:'));
  console.log(gray(`    model: ${model === 'default' ? 'gpt-4o (via fastGood)' : model}`));

  if (llmEnds[0]) {
    console.log(gray(`    response: ${llmEnds[0].responseType}`));
  }

  console.log(gray(`    calls: ${numCalls}`));

  if (llmStarts[0]) {
    console.log(gray(`    prompt: ${llmStarts[0].promptLength} chars`));
  }

  if (llmEnds.length > 0) {
    const durations = llmEnds.map((l) => l.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const avgDuration = Math.round(totalDuration / durations.length);
    console.log(
      gray(`    time: ${totalDuration}ms${numCalls > 1 ? ` (avg ${avgDuration}ms)` : ''}`)
    );
  }
};

const renderTimings = (timings) => {
  if (!timings) return;
  console.log('');
  console.log(gray('  Timing:'));
  console.log(gray(`    llm:      ${timings.llm}ms`));
  console.log(gray(`    overhead: ${timings.overhead}ms`));
  console.log(dim(`    ─────────────`));
  console.log(`    total:    ${bold(`${timings.total}ms`)}`);
};

const renderErrors = (errors) => {
  if (!errors || errors.length === 0) return;

  console.log('');
  console.log(yellow('  Errors:'));
  errors.forEach((log) => {
    console.log(yellow(`    ${log.error}`));
  });
};

const renderAnalysis = (analysis, displayOutput) => {
  if (!analysis) return;
  console.log('');
  console.log(gray('  Analysis:'));
  // Split analysis by lines and indent each
  const lines = analysis.split('\n').filter((line) => line.trim());
  lines.forEach((line) => {
    console.log(gray(`  ${line}`));
  });

  if (displayOutput) {
    console.log('');
    console.log(gray(`  Result: ${displayOutput}`));
  }
  console.log('');
};

const renderTestAnalysis = (viewModel, analysis, displayOutput) => {
  const passed = viewModel.test?.state === 'pass';
  renderTestHeader(viewModel.test.name, passed);
  renderInput(viewModel.input);
  renderOutput(viewModel.output);
  renderLLMLogs(viewModel.logs.llm);
  renderTimings(viewModel.timings);
  renderErrors(viewModel.logs.errors);
  renderAnalysis(analysis, displayOutput);
};

const renderSuiteMode = () => {
  console.log(gray('\n Suite mode: listing tests\n'));
};

const renderDetailsMode = () => {
  // Silent - no need to announce details mode
};

const renderTestListItem = (testName) => {
  console.log(gray(' · ') + testName);
};

// ────────────────────────────────────────
// Processor class
// ────────────────────────────────────────

export class DetailsProcessor extends BaseProcessor {
  constructor(options = {}) {
    const config = getConfig();
    const isEnabled = config?.aiMode === true && hasTestFilter();

    if (!isEnabled) {
      // Not enabled, create minimal processor
      super({
        name: 'Details',
        alwaysEnabled: false,
        processAsync: false,
        ...options,
      });
      return;
    }

    super({
      name: 'Details',
      alwaysEnabled: true,
      processAsync: true,
      ...options,
    });

    this.processedTests = new Set();
    this.collectedLogs = new Map();
    this.filesLoaded = new Set();
    this.fileContents = new Map();
    this.currentTestKey = undefined; // Track the currently running test
    this.currentRunId = undefined; // Track current run to prevent stale output
  }

  onInitialize() {
    if (!this.enabled) return;

    if (hasSuiteFilter() && !hasTestFilter()) {
      renderSuiteMode();
      return;
    }

    renderDetailsMode();
  }

  handleRunStart(event) {
    // Store new run ID
    this.currentRunId = event?.runId || Date.now();

    // Reset state for new run (important for watch mode reruns)
    this.processedTests.clear();
    this.collectedLogs.clear();
    this.filesLoaded.clear();
    this.fileContents.clear();
    this.currentTestKey = undefined;
  }

  handleTestStart(event) {
    if (hasSuiteFilter() && !hasTestFilter()) {
      renderTestListItem(event.testName);
      return;
    }

    const testKey = getTestKey(event);
    this.currentTestKey = testKey; // Set current test
    this.collectedLogs.set(testKey, []);
  }

  handleTestComplete(event) {
    if (hasSuiteFilter() && !hasTestFilter()) return;

    const testKey = getTestKey(event);
    if (this.processedTests.has(testKey)) return;

    this.processedTests.add(testKey);
    this.currentTestKey = undefined; // Clear current test

    // Capture run ID for validation
    const runId = this.currentRunId;

    setTimeout(async () => {
      // Only analyze if still in the same run
      if (this.currentRunId === runId) {
        await this.analyzeTest(event);
      }
    }, 500);
  }

  async processEvent(event) {
    await super.processEvent(event);

    if (!isVerbletLog(event)) return;

    const testKey = this.getCurrentTestKey(event);
    if (!testKey) return;

    const logs = this.collectedLogs.get(testKey);
    if (!logs) return;

    logs.push(event);

    if (event.file) {
      this.filesLoaded.add(event.file);
    }
  }

  async analyzeTest(event) {
    const testKey = getTestKey(event);
    const logs = this.collectedLogs.get(testKey) || [];

    if (logs.length === 0) return;

    await this.loadReferencedFiles(logs);

    const viewModel = buildTestViewModel(event, logs, this.fileContents);

    // Get LLM analysis
    const analysis = await analyzeWithLLM(viewModel);

    renderTestAnalysis(viewModel, analysis);
  }

  async loadReferencedFiles(logs) {
    for (const log of logs) {
      if (!log.file) continue;
      if (this.fileContents.has(log.file)) continue;

      try {
        const content = await extractCodeWindow(log.file, log.line || 1, 10);
        this.fileContents.set(log.file, content);
      } catch {
        this.fileContents.set(log.file, undefined);
      }
    }
  }

  getCurrentTestKey(event) {
    if (event.suite && event.testIndex !== undefined) {
      return getTestKey(event);
    }
    // Use the tracked current test key for events without test context
    return this.currentTestKey;
  }
}
