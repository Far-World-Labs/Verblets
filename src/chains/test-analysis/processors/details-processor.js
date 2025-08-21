/**
 * Details Processor
 *
 * Provides comprehensive module analysis focused on concerns and actionable items
 * from AI.md, combined with actual test execution insights.
 */

import { BaseProcessor } from './base-processor.js';
import { getConfig } from '../config.js';
import documentShrink from '../../document-shrink/index.js';
import { gatherModuleContext } from '../module-context-gatherer.js';
import { extractAdditionalModulePaths } from '../extract-module-dependencies.js';
import chatGPT from '../../../lib/chatgpt/index.js';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { gray, yellow, green, dim, bold, badges } from '../output-utils.js';
import MODULE_ANALYSIS_SCHEMA from './module-analysis-schema.json';

// ────────────────────────────────────────
// Configuration
// ────────────────────────────────────────

// Document shrink configuration
const SHRINK_TARGET_SIZE = 4000; // tokens
const SHRINK_TOKEN_BUDGET = 1000;
const SHRINK_CHUNK_SIZE = 500;

// Module context analysis query - comprehensive for concerns
const MODULE_ANALYSIS_QUERY = `
  key decision points branching logic LLM calls prompt construction prompt inputs
  model choice call configuration caching important parameters configuration values
  module imports dependencies error handling edge cases async operations timing patterns
  state management data transformations validation logic entrypoints touchpoints
  core interfaces integration points non-llm system integrations external APIs
  data flow transformations concerns issues problems TODOs actionable items
  implementation gaps missing features technical debt
`;

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

// Load AI.md and CLAUDE.md files from module and parent directories
const loadContextFiles = async (moduleDir) => {
  const files = {};

  // Try to load AI.md from module directory
  try {
    const aiMdPath = join(moduleDir, 'AI.md');
    files.moduleAI = await readFile(aiMdPath, 'utf-8');
  } catch {
    // Module AI.md not found
  }

  // Try to load CLAUDE.md and AI.md from project root
  try {
    // Find project root by looking for package.json
    let currentDir = moduleDir;
    while (currentDir !== '/' && currentDir !== '.') {
      try {
        const packagePath = join(currentDir, 'package.json');
        await readFile(packagePath, 'utf-8');
        // Found package.json, this is likely the project root
        try {
          files.projectCLAUDE = await readFile(join(currentDir, 'CLAUDE.md'), 'utf-8');
        } catch {
          // CLAUDE.md not found
        }
        try {
          files.projectAI = await readFile(join(currentDir, 'AI.md'), 'utf-8');
        } catch {
          // AI.md not found
        }
        break;
      } catch {
        currentDir = dirname(currentDir);
      }
    }
  } catch {
    // Continue searching parent directories
  }

  return files;
};

// Extract concerns from AI.md content
const extractAIGuideConcerns = async (aiGuide) => {
  if (!aiGuide) return [];

  const prompt = `
Extract all concerns, TODOs, issues, and actionable items from this AI.md file.
Look for:
- Sections labeled "Concerns", "Issues", "TODOs", "Problems", "Action Items"
- Bullet points describing problems or needed improvements
- Any text indicating something needs attention or fixing
- Implementation gaps or missing features mentioned
- Performance concerns or optimization needs

${aiGuide}

Return each concern with a brief description and category.`;

  const schema = {
    type: 'object',
    properties: {
      concerns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', maxLength: 200 },
            category: {
              type: 'string',
              enum: [
                'implementation',
                'performance',
                'testing',
                'documentation',
                'architecture',
                'integration',
              ],
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
            },
          },
          required: ['description', 'category', 'severity'],
        },
      },
    },
    required: ['concerns'],
  };

  try {
    const result = await chatGPT(prompt, {
      modelOptions: {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ai_guide_concerns',
            schema,
          },
        },
      },
    });
    return result.concerns || [];
  } catch {
    return [];
  }
};

// ────────────────────────────────────────
// Processor class
// ────────────────────────────────────────

export class DetailsProcessor extends BaseProcessor {
  constructor(options = {}) {
    const config = getConfig();
    const isEnabled = config?.aiMode === true && (hasTestFilter() || hasSuiteFilter());

    if (!isEnabled) {
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
    this.currentTestKey = undefined;
    this.currentRunId = undefined;
    this.moduleAnalyzed = false;
    this.currentModule = null;
    this.moduleTestResults = { passed: 0, failed: 0, tests: [] };
  }

  onInitialize() {
    if (!this.enabled) return;
    // Silent initialization - analysis output comes at the end
  }

  handleRunStart(event) {
    this.currentRunId = event?.runId || Date.now();
    this.processedTests.clear();
    this.collectedLogs.clear();
    this.currentTestKey = undefined;
    this.moduleAnalyzed = false;
    this.currentModule = null;
    this.moduleTestResults = { passed: 0, failed: 0, tests: [] };
  }

  handleTestStart(event) {
    const testKey = getTestKey(event);
    this.currentTestKey = testKey;
    this.collectedLogs.set(testKey, []);

    if (event.file && !this.currentModule) {
      this.currentModule = dirname(event.file);
    }
  }

  handleTestComplete(event) {
    const testKey = getTestKey(event);
    if (this.processedTests.has(testKey)) return;

    this.processedTests.add(testKey);
    this.currentTestKey = undefined;

    const logs = this.collectedLogs.get(testKey) || [];

    if (event.state === 'pass') {
      this.moduleTestResults.passed++;
    } else {
      this.moduleTestResults.failed++;
    }

    this.moduleTestResults.tests.push({
      name: event.testName,
      suite: event.suite,
      passed: event.state === 'pass',
      logs,
    });
  }

  handleRunEnd(_event) {
    if (!this.enabled || this.moduleAnalyzed || !this.currentModule) return;

    this.moduleAnalyzed = true;

    // Execute analysis synchronously to ensure output happens all at once
    this.generateComprehensiveAnalysis().catch((e) => {
      console.error('[DetailsProcessor] Analysis failed:', e.message);
    });
  }

  async processEvent(event) {
    await super.processEvent(event);

    if (!isVerbletLog(event)) return;

    const testKey = this.getCurrentTestKey(event);
    if (!testKey) return;

    const logs = this.collectedLogs.get(testKey);
    if (!logs) return;

    logs.push(event);
  }

  getCurrentTestKey(event) {
    if (event.suite && event.testIndex !== undefined) {
      return getTestKey(event);
    }
    return this.currentTestKey;
  }

  async generateComprehensiveAnalysis() {
    try {
      // Gather all data first before any output

      // Extract additional module paths from AI.md
      const additionalModulePaths = await extractAdditionalModulePaths(this.currentModule);

      // Gather module context
      const moduleContext = await gatherModuleContext(this.currentModule, {
        additionalModulePaths,
      });

      // Use document-shrink to extract relevant code
      let shrunkContext;
      try {
        shrunkContext = await documentShrink(moduleContext.content, MODULE_ANALYSIS_QUERY, {
          targetSize: SHRINK_TARGET_SIZE * 2,
          tokenBudget: SHRINK_TOKEN_BUDGET * 2,
          chunkSize: SHRINK_CHUNK_SIZE,
        });
      } catch {
        shrunkContext = { content: moduleContext.content.substring(0, SHRINK_TARGET_SIZE * 100) };
      }

      // Load context files from module and project root
      const contextFiles = await loadContextFiles(this.currentModule);

      // Extract concerns from module AI.md if present
      const aiGuideConcerns = contextFiles.moduleAI
        ? await extractAIGuideConcerns(contextFiles.moduleAI)
        : [];

      // Prepare test execution summary
      const testExecutionSummary = await this.prepareTestExecutionSummary();

      // Generate comprehensive concern-focused analysis
      const analysis = await this.performConcernAnalysis({
        moduleDir: this.currentModule,
        moduleCode: shrunkContext.content,
        testExecution: testExecutionSummary,
        metadata: moduleContext.metadata,
        contextFiles,
        aiGuideConcerns,
        testResults: this.moduleTestResults,
      });

      // Now render everything at once
      console.log('');
      console.log('═'.repeat(70));
      console.log(bold('MODULE DETAIL ANALYSIS'));
      console.log('─'.repeat(70));
      this.renderComprehensiveOutput(analysis, moduleContext.metadata);
    } catch (e) {
      console.error('[DetailsProcessor] Error:', e.message);
      if (e.message.includes('aborted')) {
        console.error('[DetailsProcessor] Analysis timed out - module may be too large or complex');
      }
    }
  }

  prepareTestExecutionSummary() {
    const testDetails = [];
    let allLogs = [];

    for (const test of this.moduleTestResults.tests) {
      const logs = test.logs || [];
      allLogs.push(...logs);

      const inputLog = logs.find((l) => l.event === 'bool:input');
      const outputLog = logs.find((l) => l.event === 'bool:output');
      const llmLogs = logs.filter((l) => l.event?.includes(':llm:'));
      const errors = logs.filter((l) => l.event?.includes(':error'));
      const timingLogs = logs.filter((l) => l.event?.includes(':timing'));

      testDetails.push({
        name: test.name,
        passed: test.passed,
        input: inputLog?.full || 'N/A',
        output: outputLog?.full || 'N/A',
        llmCalls: llmLogs.filter((l) => l.event.includes('start')).length,
        errors: errors.map((e) => e.error).join('; '),
        totalDuration: timingLogs.reduce((sum, l) => sum + (l.duration || 0), 0),
      });
    }

    // Create execution pattern summary
    const executionPatterns = `
Test Execution Patterns:
- Total tests: ${testDetails.length}
- Passed: ${testDetails.filter((t) => t.passed).length}
- Failed: ${testDetails.filter((t) => !t.passed).length}
- LLM usage: ${allLogs.filter((l) => l.event?.includes(':llm:start')).length} total calls
- Errors encountered: ${allLogs.filter((l) => l.event?.includes(':error')).length}
- Input patterns: ${[...new Set(testDetails.map((t) => t.input))].join(', ')}
- Output patterns: ${[...new Set(testDetails.map((t) => t.output))].join(', ')}
    `.trim();

    return {
      tests: testDetails,
      executionPatterns,
      summary: {
        totalTests: testDetails.length,
        passed: testDetails.filter((t) => t.passed).length,
        failed: testDetails.filter((t) => !t.passed).length,
        totalLLMCalls: allLogs.filter((l) => l.event?.includes(':llm:start')).length,
        totalErrors: allLogs.filter((l) => l.event?.includes(':error')).length,
      },
    };
  }

  async performConcernAnalysis({
    moduleDir,
    moduleCode,
    testExecution,
    metadata,
    contextFiles,
    aiGuideConcerns,
    testResults,
  }) {
    const { asXML } = await import('../../../prompts/wrap-variable.js');

    const total = testResults.passed + testResults.failed;
    const testCoverage = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;

    // Format AI.md concerns for the prompt
    const aiConcernsText =
      aiGuideConcerns.length > 0
        ? aiGuideConcerns.map((c) => `- [${c.severity}] ${c.category}: ${c.description}`).join('\n')
        : 'No explicit concerns found in AI.md';

    const prompt = `
Perform a comprehensive concern-focused analysis of this module.

${asXML(
  `Module: ${moduleDir}
Files: ${metadata.fileCount} (${metadata.dependencyCount} dependencies)
Test Coverage: ${testCoverage}%`,
  { tag: 'module_info' }
)}

${asXML(testExecution.executionPatterns, { tag: 'execution_patterns' })}

${asXML(
  `Concerns extracted from AI.md:
${aiConcernsText}`,
  { tag: 'ai_md_concerns' }
)}

${
  contextFiles.projectCLAUDE
    ? asXML(contextFiles.projectCLAUDE, { tag: 'project_claude_md', location: 'Project Root' })
    : ''
}

${
  contextFiles.projectAI
    ? asXML(contextFiles.projectAI, { tag: 'project_ai_md', location: 'Project Root' })
    : ''
}

${
  contextFiles.moduleAI
    ? asXML(contextFiles.moduleAI, { tag: 'module_ai_md', location: moduleDir })
    : ''
}

${asXML(moduleCode, { tag: 'module_code' })}

Instructions:
- READ the project CLAUDE.md and AI.md files carefully for context about design decisions
- Analyze how well the implementation addresses any module-specific AI.md concerns  
- Identify NEW concerns based on code and test execution that aren't already explained by project context
- Provide specific, actionable recommendations aligned with project philosophy
- Focus on practical issues that affect module functionality within the project's design constraints
- Evaluate integration points and dependencies`;

    try {
      const analysis = await chatGPT(prompt, {
        modelOptions: {
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'concern_analysis',
              schema: MODULE_ANALYSIS_SCHEMA,
            },
          },
        },
      });
      return analysis;
    } catch (e) {
      return {
        purpose: 'Error analyzing module',
        workingState: {
          assessment: 'critical',
          details: `Analysis failed: ${e.message}`,
          testCoverage,
        },
        concerns: [],
        recommendations: [],
      };
    }
  }

  renderComprehensiveOutput(analysis, metadata) {
    console.log(`Module: ${this.currentModule}`);
    console.log(
      `Files: ${metadata.fileCount} analyzed${
        metadata.dependencyCount > 0 ? ` (${metadata.dependencyCount} dependencies)` : ''
      }`
    );
    console.log('─'.repeat(70));

    // Tests Run Section
    console.log('');
    console.log(bold('TESTS RUN'));
    const total = this.moduleTestResults.passed + this.moduleTestResults.failed;
    const statusColor = this.moduleTestResults.failed === 0 ? green : yellow;
    console.log(statusColor(`  ${this.moduleTestResults.passed}/${total} passed`));

    for (const test of this.moduleTestResults.tests) {
      const status = test.passed ? badges.pass() : badges.test();
      const logs = test.logs || [];
      const inputLog = logs.find((l) => l.event === 'bool:input');
      const outputLog = logs.find((l) => l.event === 'bool:output');
      const llmCount = logs.filter((l) => l.event?.includes(':llm:start')).length;

      console.log(`\n  ${status} ${test.name}`);
      if (inputLog) {
        console.log(gray(`      Input: "${inputLog.full}"`));
      }
      if (outputLog) {
        console.log(gray(`      Output: ${outputLog.full}`));
      }
      if (llmCount > 0) {
        console.log(gray(`      LLM calls: ${llmCount}`));
      }
    }

    // Module Purpose & State
    console.log('');
    console.log(bold('MODULE PURPOSE'));
    console.log(gray(analysis.purpose));

    console.log('');
    console.log(bold('WORKING STATE'));
    const stateColor =
      {
        healthy: green,
        needs_attention: yellow,
        critical: (text) => `\x1b[31m${text}\x1b[0m`,
      }[analysis.workingState.assessment] || gray;
    console.log(stateColor(`  Status: ${analysis.workingState.assessment.toUpperCase()}`));
    console.log(gray(`  ${analysis.workingState.details}`));
    console.log(gray(`  Test Coverage: ${analysis.workingState.testCoverage}%`));

    // Concerns Section - The main focus
    if (analysis.concerns?.length > 0) {
      console.log('');
      console.log(bold('CONCERNS'));

      // Separate AI.md concerns from discovered concerns
      const aiMdConcerns = analysis.concerns.filter((c) => c.fromAiMd);
      const discoveredConcerns = analysis.concerns.filter((c) => !c.fromAiMd);

      if (aiMdConcerns.length > 0) {
        console.log('');
        console.log(dim('  From AI.md:'));
        aiMdConcerns.forEach((concern) => {
          const severityColor = {
            low: gray,
            medium: yellow,
            high: (text) => `\x1b[31m${text}\x1b[0m`,
          }[concern.severity];
          console.log(
            severityColor(`    [${concern.severity}] ${concern.type}: ${concern.description}`)
          );
          if (concern.sourceFile) {
            console.log(dim(`         File: ${concern.sourceFile}`));
          }
        });
      }

      if (discoveredConcerns.length > 0) {
        console.log('');
        console.log(dim('  Discovered from Analysis:'));
        discoveredConcerns.forEach((concern) => {
          const severityColor = {
            low: gray,
            medium: yellow,
            high: (text) => `\x1b[31m${text}\x1b[0m`,
          }[concern.severity];
          console.log(
            severityColor(`    [${concern.severity}] ${concern.type}: ${concern.description}`)
          );
          if (concern.sourceFile) {
            console.log(dim(`         File: ${concern.sourceFile}`));
          }
        });
      }
    }

    // Recommendations - Actionable items
    if (analysis.recommendations?.length > 0) {
      console.log('');
      console.log(bold('RECOMMENDATIONS'));

      analysis.recommendations.forEach((rec, i) => {
        const priorityColor = {
          low: gray,
          medium: yellow,
          high: (text) => `\x1b[31m${text}\x1b[0m`,
        }[rec.priority];

        console.log('');
        console.log(priorityColor(`  ${i + 1}. [${rec.priority}] ${rec.action}`));
        if (rec.rationale) {
          console.log(dim(`     Rationale: ${rec.rationale}`));
        }
        if (rec.relatedConcern) {
          console.log(dim(`     Addresses: Concern ${rec.relatedConcern}`));
        }
        console.log(dim(`     Category: ${rec.category}`));
      });
    }

    // Integration Points (if relevant)
    if (analysis.integrations?.length > 0) {
      console.log('');
      console.log(bold('KEY INTEGRATIONS'));
      analysis.integrations.forEach((int) => {
        console.log(gray(`  • ${int.module} (${int.type}, ${int.frequency} use)`));
        if (int.apis?.length > 0) {
          console.log(dim(`    APIs: ${int.apis.join(', ')}`));
        }
      });
    }

    // Capabilities (brief)
    if (analysis.capabilities?.length > 0) {
      console.log('');
      console.log(bold('CAPABILITIES'));
      analysis.capabilities.forEach((cap) => {
        console.log(gray(`  • ${cap}`));
      });
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('');
  }
}
