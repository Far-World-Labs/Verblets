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
import { gray, yellow, green, dim, bold, badges, red } from '../output-utils.js';
import MODULE_ANALYSIS_SCHEMA from '../schemas/module-analysis-schema.json';
import { findProjectRoot } from '../../../lib/find-project-root/index.js';

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
  const projectRoot = await findProjectRoot(moduleDir);
  if (projectRoot) {
    try {
      files.projectCLAUDE = await readFile(join(projectRoot, 'CLAUDE.md'), 'utf-8');
    } catch {
      // CLAUDE.md not found
    }
    try {
      files.projectAI = await readFile(join(projectRoot, 'AI.md'), 'utf-8');
    } catch {
      // AI.md not found
    }
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
    this.firstSuite = null;
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
    this.firstSuite = null;
    this.moduleTestResults = { passed: 0, failed: 0, tests: [] };
  }

  handleTestStart(event) {
    // Defensive: only process first module we see
    if (this.moduleAnalyzed) return;

    // Set current module from first test we see
    if (event.file && !this.currentModule) {
      this.currentModule = dirname(event.file);
      this.firstSuite = event.suite;
    }

    // Skip tests from other suites/modules
    if (this.currentModule && event.file) {
      const testModule = dirname(event.file);
      if (testModule !== this.currentModule) {
        return;
      }
    }

    const testKey = getTestKey(event);
    this.currentTestKey = testKey;
    this.collectedLogs.set(testKey, []);
  }

  handleTestComplete(event) {
    // Skip if already analyzed or from different module
    if (this.moduleAnalyzed) return;

    // Skip tests from other modules
    if (this.currentModule && event.file) {
      const testModule = dirname(event.file);
      if (testModule !== this.currentModule) {
        return;
      }
    }

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

    // Skip if already analyzed
    if (this.moduleAnalyzed) return;

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
      console.log(gray('  [DetailsProcessor] Analyzing module... Started'));

      // Start progress timer
      const startTime = Date.now();
      const progressTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(gray(`  [DetailsProcessor] Analyzing module... ${elapsed}s elapsed`));
      }, 10000); // Update every 10 seconds
      progressTimer.unref(); // Don't block process exit

      try {
        // Gather all data first before any output

        // Extract additional module paths from AI.md
        const additionalModulePaths = await extractAdditionalModulePaths(this.currentModule);

        // Gather module context
        const moduleContext = await gatherModuleContext(this.currentModule, {
          additionalModulePaths,
        });

        // Use document-shrink ONLY for module code (JS + MD files)
        let shrunkModuleCode;
        try {
          shrunkModuleCode = await documentShrink(moduleContext.content, MODULE_ANALYSIS_QUERY, {
            targetSize: SHRINK_TARGET_SIZE, // Fixed target for module code
            tokenBudget: SHRINK_TOKEN_BUDGET,
            chunkSize: SHRINK_CHUNK_SIZE,
          });
        } catch {
          shrunkModuleCode = {
            content: moduleContext.content.substring(0, SHRINK_TARGET_SIZE * 100),
          };
        }

        // Load context files from module and project root
        const contextFiles = await loadContextFiles(this.currentModule);

        // Extract concerns from module AI.md if present
        const aiGuideConcerns = contextFiles.moduleAI
          ? await extractAIGuideConcerns(contextFiles.moduleAI)
          : [];

        // Prepare all other data for summaryMap compression
        const testExecutionData = this.prepareTestExecutionSummary();

        // Extract deterministic module stats (don't compress, they're small and useful)
        const moduleStats = this.extractModuleStats(testExecutionData, moduleContext);

        // Calculate remaining token budget after module code
        const moduleCodeTokens = Math.floor(shrunkModuleCode.content.length / 4); // rough estimate
        const totalBudget = SHRINK_TARGET_SIZE * 3; // Total context budget
        const remainingBudget = totalBudget - moduleCodeTokens;

        // Use 40% of remaining budget for test logs
        const testBudget = Math.floor(remainingBudget * 0.4);

        // Build stable summaryMap (for better caching when tests change)
        const summaryMap = new Map();

        // Add execution patterns (already summarized)
        summaryMap.set('executionPatterns', testExecutionData.executionPatterns);

        // Add AI guide concerns if present
        if (aiGuideConcerns.length > 0) {
          // Sort concerns for deterministic ordering
          const sortedConcerns = [...aiGuideConcerns].sort((a, b) =>
            `${a.severity}-${a.category}`.localeCompare(`${b.severity}-${b.category}`)
          );
          summaryMap.set('aiGuideConcerns', JSON.stringify(sortedConcerns));
        }

        // Add metadata (sorted keys for determinism)
        const metadata = {
          dependencyCount: moduleContext.metadata.dependencyCount,
          fileCount: moduleContext.metadata.fileCount,
          llmCalls: testExecutionData.summary.totalLLMCalls,
          testsFailed: testExecutionData.summary.failed,
          testsPassed: testExecutionData.summary.passed,
        };
        summaryMap.set('metadata', JSON.stringify(metadata));

        // Build separate test summaryMap (changes more frequently)
        const testSummaryMap = new Map();

        // Compress test logs separately
        if (testExecutionData.consolidatedLogs) {
          try {
            const compressedLogs = await documentShrink(
              testExecutionData.consolidatedLogs,
              'test execution errors failures inputs outputs LLM calls timing',
              { targetSize: testBudget, tokenBudget: 200, chunkSize: 200 }
            );
            testSummaryMap.set('testLogs', compressedLogs.content);
          } catch {
            testSummaryMap.set(
              'testLogs',
              testExecutionData.consolidatedLogs.substring(0, testBudget * 4)
            );
          }
        }

        // Generate comprehensive concern-focused analysis
        const analysis = await this.performConcernAnalysis({
          moduleDir: this.currentModule,
          moduleCode: shrunkModuleCode.content,
          summaryMap,
          testSummaryMap,
          moduleStats,
          metadata: moduleContext.metadata,
          contextFiles,
          testResults: this.moduleTestResults,
        });

        // Now render everything at once
        console.log('');
        console.log('═'.repeat(70));
        console.log(bold('MODULE DETAIL ANALYSIS'));
        console.log('─'.repeat(70));
        this.renderComprehensiveOutput(analysis, moduleContext.metadata);
      } finally {
        clearInterval(progressTimer);
      }
    } catch (e) {
      console.error('[DetailsProcessor] Error:', e.message);
      if (e.message.includes('aborted')) {
        console.error('[DetailsProcessor] Analysis timed out - module may be too large or complex');
      }
    }
  }

  extractModuleStats(testExecutionData, moduleContext) {
    // Extract performance stats from test execution
    const allLogs = testExecutionData.allLogs || [];
    const llmLogs = allLogs.filter((l) => l.event?.includes(':llm:'));
    const llmStarts = llmLogs.filter((l) => l.event?.includes(':start'));
    const llmCompletes = llmLogs.filter((l) => l.event?.includes(':complete'));

    // Calculate timing stats
    let totalLLMTime = 0;
    let totalOverhead = 0;
    let totalExecution = 0;

    // Build model breakdown
    const modelBreakdown = {};
    llmStarts.forEach((startLog, i) => {
      const model = startLog.model || 'default';
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { count: 0, totalTime: 0, promptSizes: [] };
      }
      modelBreakdown[model].count++;

      // Track prompt size
      if (startLog.promptLength) {
        modelBreakdown[model].promptSizes.push(startLog.promptLength);
      }

      // Find corresponding complete log
      const completeLog = llmCompletes[i];
      if (completeLog?.duration) {
        modelBreakdown[model].totalTime += completeLog.duration;
        totalLLMTime += completeLog.duration;
      }
    });

    // Calculate average prompt sizes per model
    Object.values(modelBreakdown).forEach((data) => {
      if (data.promptSizes.length > 0) {
        data.avgPromptSize = Math.round(
          data.promptSizes.reduce((a, b) => a + b, 0) / data.promptSizes.length
        );
      }
    });

    const timingLogs = allLogs.filter((l) => l.event?.includes(':timing'));
    timingLogs.forEach((log) => {
      if (log.event?.includes('total')) totalExecution = log.duration || 0;
      if (log.event?.includes('overhead')) totalOverhead = log.duration || 0;
    });

    // Get prompt sizes
    const promptSizes = [];
    llmStarts.forEach((log) => {
      if (log.promptLength) promptSizes.push(log.promptLength);
    });

    return {
      llmUsage: {
        totalCalls: llmStarts.length,
        modelsUsed: Array.from(new Set(llmStarts.map((l) => l.model).filter(Boolean))).sort(),
        modelBreakdown,
        avgPromptSize:
          promptSizes.length > 0
            ? Math.round(promptSizes.reduce((a, b) => a + b, 0) / promptSizes.length)
            : 0,
        maxPromptSize: Math.max(...promptSizes, 0),
      },
      performance: {
        totalExecution,
        llmTime: totalLLMTime,
        avgLLMTime: llmStarts.length > 0 ? Math.round(totalLLMTime / llmStarts.length) : 0,
        overhead: totalOverhead,
        llmPercentage: totalExecution > 0 ? Math.round((totalLLMTime / totalExecution) * 100) : 0,
      },
      moduleMetrics: {
        fileCount: moduleContext.metadata.fileCount,
        dependencyCount: moduleContext.metadata.dependencyCount,
        linesOfCode: moduleContext.metadata.linesOfCode || 0,
      },
    };
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

    // Create consolidated logs for compression
    const consolidatedLogs = allLogs
      .map((log) => {
        if (log.event?.includes(':llm:')) {
          return `[LLM] ${log.event} model=${log.model || 'default'} duration=${
            log.duration || 0
          }ms`;
        }
        if (log.event?.includes(':error')) {
          return `[ERROR] ${log.error}`;
        }
        if (log.event === 'bool:input') {
          return `[INPUT] "${log.full}"`;
        }
        if (log.event === 'bool:output') {
          return `[OUTPUT] ${log.full} (${log.value})`;
        }
        if (log.event?.includes(':timing')) {
          return `[TIMING] ${log.event} duration=${log.duration}ms`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

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
      consolidatedLogs,
      executionPatterns,
      allLogs, // Include for stats extraction
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
    summaryMap,
    testSummaryMap,
    moduleStats,
    metadata,
    contextFiles,
    testResults,
  }) {
    const { asXML } = await import('../../../prompts/wrap-variable.js');

    const total = testResults.passed + testResults.failed;
    const testCoverage = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;

    // AI.md concerns are passed directly to the analysis
    // They're included in the summaryMap if present

    // Build comprehensive development dashboard prompt
    const promptSections = [];

    // Module context
    promptSections.push(`Generate a comprehensive development dashboard for this module.
Think like a senior engineer reviewing the module's current state and providing actionable feedback.
Be thorough and detailed in your analysis - provide rich, thoughtful explanations.`);

    // Basic module info
    promptSections.push(
      asXML(
        `Module: ${moduleDir}
Files: ${metadata.fileCount} (${metadata.dependencyCount} dependencies)
Test Coverage: ${testCoverage}%`,
        { tag: 'module_info' }
      )
    );

    // Performance and execution metrics
    promptSections.push(
      asXML(JSON.stringify(moduleStats, null, 2), { tag: 'performance_metrics' })
    );

    // Test execution patterns
    if (summaryMap.has('executionPatterns')) {
      promptSections.push(asXML(summaryMap.get('executionPatterns'), { tag: 'test_patterns' }));
    }

    // Test execution logs
    if (testSummaryMap.has('testLogs')) {
      promptSections.push(asXML(testSummaryMap.get('testLogs'), { tag: 'test_execution' }));
    }

    // Development context and notes
    if (contextFiles.moduleAI) {
      promptSections.push(
        asXML(contextFiles.moduleAI, {
          tag: 'development_notes',
          description: 'Module-specific design notes, tensions, and development context',
        })
      );
    }

    // Project-level guidance
    if (contextFiles.projectAI) {
      promptSections.push(
        asXML(contextFiles.projectAI, {
          tag: 'project_patterns',
          description: 'Project-wide patterns and architectural guidance',
        })
      );
    }

    if (contextFiles.projectCLAUDE) {
      promptSections.push(
        asXML(contextFiles.projectCLAUDE, {
          tag: 'project_philosophy',
          description: 'Core project philosophy and design principles',
        })
      );
    }

    // The actual module implementation
    promptSections.push(asXML(moduleCode, { tag: 'implementation' }));

    // Analysis instructions
    promptSections.push(`
Look carefully at the purpose of the module to understand its intended role in the system.
Provide a comprehensive module health dashboard covering:

MODULE PURPOSE: One-line description of what this module does

DESCRIPTION: Two well-considered paragraphs discussing the module from the perspective of its apparent intent. 
First paragraph: What problem is it solving? What is the module's core purpose and how does it achieve its goals?
Discuss the design philosophy it embodies and what architectural patterns it follows. Consider the module's
role in the larger system and how it interfaces with other components.

Second paragraph: Analyze the implied architectural decisions and engineering tradeoffs. What design choices
were made and why? Consider performance vs flexibility, simplicity vs feature completeness, abstraction levels,
error handling philosophy, and testing approach. Discuss how well the implementation aligns with its stated goals.

WORKING STATE: Current health assessment (production_ready/functional/needs_work/experimental/broken) with explanation
- Consider test coverage, code quality, design coherence, performance metrics
- Note if the module is production-ready or needs work

ARCHITECTURE GRAPH: Generate a dot graph (5-20 nodes) showing module structure
\`\`\`dot
digraph ModuleArchitecture {
  // Show entrypoints, key functions, integrations, data flow
  // Include clusters for subsystems
  // Add edge labels for data types or control flow
  // Example structure (customize based on actual module):
  // entry [label="index.js\\nMain Export"];
  // llm [label="LLM\\nCall"];
  // entry -> llm [label="prompt"];
}
\`\`\`

ANALYSIS: Combined list of concerns and recommendations (aim for at least 8 items total, with 4+ actionable recommendations)
- Actual bugs or defects with line numbers (mark as concerns)
- Misalignments between stated intent and implementation (concerns)
- Design tensions or unresolved trade-offs (concerns)
- Technical debt or areas needing refactoring (concerns or recommendations)
- Missing test coverage for specific scenarios (recommendations with specific test names)
- Performance optimizations (recommendations with implementation details)
- Integration improvements with dependencies (recommendations)
- Refactoring opportunities (recommendations with clear benefits)
- Each item should be marked as either "concern" (observation) or "recommendation" (action)
- Prioritize by impact (high/medium/low)
- Be specific: name exact test cases, point to code locations, provide implementation guidance
- Recommendations should include full explanations of what to do and why it matters

KEY INTEGRATIONS: How this module connects to the system
- Direct dependencies and their usage patterns
- APIs or contracts it exposes
- Performance characteristics relevant to consumers

CAPABILITIES: What the module can do (bullet list)
- Current features and limitations
- Performance characteristics
- Design patterns employed

The development_notes tag contains the team's current thinking about this module.
The project_patterns tag contains patterns that should be followed.
Use these as context but focus on the actual implementation's current state.`);

    const prompt = promptSections.filter((s) => s).join('\n\n');

    // Debug output - show stats and optionally full prompt
    const debugEnabled =
      process.env.DEBUG_DETAIL_PROCESSOR === '1' || process.env.DEBUG_DETAIL_PROCESSOR === 'true';
    if (debugEnabled) {
      console.log('');
      console.log('─'.repeat(70));
      console.log(bold('[DEBUG] Analysis Stats:'));
      console.log(`  Module code size: ${moduleCode.length} chars`);
      console.log(
        `  Test logs compressed: ${
          testSummaryMap.has('testLogs') ? testSummaryMap.get('testLogs').length : 0
        } chars`
      );
      console.log(`  Context files loaded: ${Object.keys(contextFiles).length}`);
      console.log(
        `  Total prompt length: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`
      );

      if (process.env.DEBUG_DETAIL_PROCESSOR === 'full') {
        console.log('─'.repeat(70));
        console.log(bold('[DEBUG] Full prompt:'));
        console.log('─'.repeat(70));
        console.log(prompt.substring(0, 2000) + (prompt.length > 2000 ? '\n... [truncated]' : ''));
      }
      console.log('─'.repeat(70));
      console.log('');
    }

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
        analysis: [],
      };
    }
  }

  renderComprehensiveOutput(analysis, metadata) {
    console.log(`Module: ${this.currentModule}`);

    // Build file type breakdown string
    let fileTypeStr = '';
    if (metadata.fileTypeBreakdown && Object.keys(metadata.fileTypeBreakdown).length > 0) {
      const types = Object.entries(metadata.fileTypeBreakdown)
        .map(([ext, count]) => `${count} ${ext}`)
        .join(', ');
      fileTypeStr = ` (${types})`;
    }

    console.log(
      `Files: ${metadata.fileCount} analyzed${fileTypeStr}${
        metadata.dependencyCount > 0 ? `, ${metadata.dependencyCount} dependencies` : ''
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
      const llmStarts = logs.filter((l) => l.event?.includes(':llm:start'));
      const llmCompletes = logs.filter((l) => l.event?.includes(':llm:complete'));
      // const timingLogs = logs.filter((l) => l.event?.includes(':timing'));

      console.log(`\n  ${status} ${test.name}`);

      // Check for input/output logging
      if (inputLog) {
        console.log(gray(`      Input: "${inputLog.full}"`));
      } else if (logs.length > 0) {
        console.log(red(`      [NEEDS IMPLEMENTATION - Log input for test visibility]`));
      }

      if (outputLog) {
        console.log(gray(`      Output: ${outputLog.full}`));
      } else if (logs.length > 0) {
        console.log(red(`      [NEEDS IMPLEMENTATION - Log output for test visibility]`));
      }

      if (llmStarts.length > 0) {
        const models = [...new Set(llmStarts.map((l) => l.model).filter(Boolean))];
        let llmInfo = `      LLM calls: ${llmStarts.length}`;
        if (models.length > 0) llmInfo += ` (${models.join(', ')})`;

        // Add timing info if available
        const totalTime = llmCompletes.reduce((sum, l) => sum + (l.duration || 0), 0);
        if (totalTime > 0) {
          llmInfo += ` - ${totalTime}ms`;
        }
        console.log(gray(llmInfo));
      } else if (logs.length === 0) {
        console.log(
          red(`      [NEEDS IMPLEMENTATION - Add comprehensive logging to track test execution]`)
        );
      }
    }

    // Module Purpose & State
    console.log('');
    console.log(bold('MODULE PURPOSE'));
    console.log(gray(analysis.purpose));

    if (analysis.moduleIntent) {
      console.log('');
      console.log(bold('DESCRIPTION'));
      // Handle multi-paragraph description
      const paragraphs = analysis.moduleIntent.split('\n\n').filter((p) => p.trim());
      paragraphs.forEach((paragraph, i) => {
        if (i > 0) console.log('');
        console.log(gray(paragraph));
      });
    }

    console.log('');
    console.log(bold('WORKING STATE'));
    const stateColor =
      {
        production_ready: green,
        functional: green,
        needs_work: yellow,
        experimental: dim,
        broken: (text) => `\x1b[31m${text}\x1b[0m`,
      }[analysis.workingState.assessment] || gray;
    console.log(stateColor(`  Status: ${analysis.workingState.assessment.toUpperCase()}`));
    console.log(gray(`  ${analysis.workingState.details}`));
    console.log(gray(`  Test Coverage: ${analysis.workingState.testCoverage}%`));

    // Performance Stats Section
    console.log('');
    console.log(bold('PERFORMANCE STATS'));
    const stats = this.extractModuleStats(this.prepareTestExecutionSummary(), { metadata });

    if (stats.llmUsage.totalCalls > 0) {
      console.log(gray(`  LLM Calls: ${stats.llmUsage.totalCalls}`));

      // Show model usage with counts and performance
      if (stats.llmUsage.modelBreakdown && Object.keys(stats.llmUsage.modelBreakdown).length > 0) {
        Object.entries(stats.llmUsage.modelBreakdown).forEach(([model, data]) => {
          const avgTime = data.totalTime > 0 ? Math.round(data.totalTime / data.count) : 0;
          const avgPrompt = data.avgPromptSize || 0;
          if (avgTime > 0 || avgPrompt > 0) {
            console.log(
              gray(
                `    ${model}: ${data.count} call${
                  data.count !== 1 ? 's' : ''
                }, avg ${avgTime}ms, ~${avgPrompt} chars/prompt`
              )
            );
          } else {
            console.log(gray(`    ${model}: ${data.count} call${data.count !== 1 ? 's' : ''}`));
            console.log(
              red(
                `      [NEEDS IMPLEMENTATION - Log duration and prompt size for performance tracking]`
              )
            );
          }
        });
      }

      if (stats.llmUsage.avgPromptSize > 0) {
        console.log(gray(`  Avg Prompt: ${stats.llmUsage.avgPromptSize} chars`));
      }
    } else {
      console.log(red(`  [NEEDS IMPLEMENTATION - Output performance logs to enable this feature]`));
    }

    if (stats.performance.totalExecution > 0) {
      console.log(gray(`  Total Time: ${stats.performance.totalExecution}ms`));
      if (stats.performance.llmTime > 0) {
        console.log(
          gray(
            `  LLM Time: ${stats.performance.llmTime}ms (${stats.performance.llmPercentage}% of total)`
          )
        );
        console.log(gray(`  Overhead: ${stats.performance.overhead}ms`));
      }
    } else if (stats.llmUsage.totalCalls > 0) {
      console.log(red(`  [NEEDS IMPLEMENTATION - Log total execution time and overhead]`));
    }

    // Add performance patterns analysis
    console.log('');
    console.log(gray('  Performance Patterns:'));

    // Check for parallel operations
    const hasParallelPromises = metadata.fileCount > 1; // Files were read in parallel
    if (hasParallelPromises) {
      console.log(gray('    • Parallel file processing detected'));
    }

    // Estimate complexity based on file count and dependencies
    const estimatedComplexity =
      metadata.dependencyCount > 10
        ? 'O(n²)'
        : metadata.dependencyCount > 5
        ? 'O(n log n)'
        : 'O(n)';
    console.log(
      gray(`    • Estimated complexity: ${estimatedComplexity} based on dependency graph`)
    );

    // Check for async patterns
    if (stats.llmUsage.totalCalls > 0) {
      const isSequential =
        stats.llmUsage.totalCalls === 1 ||
        stats.performance.llmTime === stats.performance.totalExecution;
      console.log(
        gray(`    • LLM calls: ${isSequential ? 'Sequential' : 'May have concurrent operations'}`)
      );
    }

    // Memory usage patterns
    const estimatedMemory =
      metadata.totalSize > 1000000 ? 'High' : metadata.totalSize > 100000 ? 'Moderate' : 'Low';
    console.log(
      gray(
        `    • Memory usage: ${estimatedMemory} (${Math.round(
          metadata.totalSize / 1024
        )}KB processed)`
      )
    );

    // Architecture Graph
    if (analysis.architectureGraph) {
      console.log('');
      console.log(bold('ARCHITECTURE'));
      console.log(dim('```dot'));
      console.log(gray(analysis.architectureGraph));
      console.log(dim('```'));
    }

    // Analysis - Combined Concerns & Recommendations
    if (analysis.analysis?.length > 0) {
      console.log('');
      console.log(bold('ANALYSIS & RECOMMENDATIONS'));

      // Sort by priority (high -> medium -> low) and type (recommendations first)
      const sortedItems = [...analysis.analysis].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const typeOrder = { recommendation: 0, concern: 1 };

        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return typeOrder[a.itemType] - typeOrder[b.itemType];
      });

      sortedItems.forEach((item) => {
        const priorityColor =
          {
            low: gray,
            medium: yellow,
            high: (text) => `\x1b[31m${text}\x1b[0m`,
          }[item.priority] || gray;

        console.log('');
        const itemPrefix = item.itemType === 'recommendation' ? '→' : '•';
        const itemLabel = item.itemType === 'recommendation' ? 'REC' : 'CONCERN';

        console.log(
          priorityColor(
            `  ${itemPrefix} [${item.priority.toUpperCase()} ${itemLabel}] ${item.description}`
          )
        );

        if (item.rationale) {
          console.log(dim(`     Why: ${item.rationale}`));
        }
        if (item.location) {
          console.log(dim(`     Location: ${item.location}`));
        }
        if (item.category) {
          console.log(dim(`     Category: ${item.category}`));
        }
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
