/**
 * Details Processor v2
 *
 * Single Responsibility: Orchestrate data sources and coordinate presentation
 * - Compose multiple data sources in parallel
 * - Coordinate view rendering at appropriate times
 * - All transformations, viewmodels, and renderers are imported
 */

import { BaseProcessor } from './base-processor.js';
import { getConfig } from '../config.js';
import { createSeparator, red, gray, badges, createBoxedCode } from '../output-utils.js';
import analyzeTestError from '../../test-analyzer/index.js';
import { extractCodeWindow } from '../../../lib/code-extractor/index.js';

// Data collectors
import { TestCollector } from '../collectors/test-collector.js';
import { ModuleCollector } from '../collectors/module-collector.js';
import { IntentCollector } from '../collectors/intent-collector.js';
import { extractAIMdConfig } from '../utils/ai-md-extractor.js';
import { getDefaultIntents } from '../utils/default-intents.js';
import { findProjectRoot } from '../../../lib/find-project-root/index.js';

// Views (build + render combined)
import { renderTestSummary } from '../views/test-summary.js';
import { renderModuleOverview } from '../views/module-overview.js';
import { renderAnalysisStart } from '../views/analysis-start.js';
import { processIntent } from '../intent-handlers.js';

// Utilities
import { trackAsyncProgress } from '../utils/async-progress.js';

function debugProcessEvent(event) {
  const eventType = event.type || event.event;
  console.log('[DetailsProcessor] processEvent called with:', eventType);
}

export class DetailsProcessor extends BaseProcessor {
  constructor(options = {}) {
    const config = getConfig();
    // Enable if in aiMode AND hasTestFilter from policy
    const isEnabled = config?.aiMode === true && options.policy?.hasTestFilter === true;

    super({
      name: 'Details',
      alwaysEnabled: isEnabled,
      processAsync: isEnabled,
      ringBuffer: options.ringBuffer, // Pass ringBuffer to base
      ...options,
    });

    // Data collectors
    this.testCollector = new TestCollector();
    this.moduleCollector = new ModuleCollector();
    this.intentCollector = new IntentCollector();

    // Start async work early
    this.moduleContextPromise = undefined;
    this.aiMdConfigPromise = undefined;

    this.rendered = false;
  }

  async analyzeTestFailure(test, allEvents) {
    // Find events for this specific test
    const testEvents =
      allEvents?.filter(
        (e) =>
          e.testName === test.name ||
          e.testIndex === test.index ||
          (e.timestamp >= test.startTime && e.timestamp <= test.endTime)
      ) || [];

    // Find failed expectation
    const failedExpect = testEvents.find(
      (e) => (e.event === 'expect' || e.event === 'ai-expect') && e.passed === false
    );

    const output = [];

    // Header with badge
    output.push(`${badges.fail()}  ${test.suite || 'Test Suite'}`);
    output.push(`  ${test.name}`);

    // Location (like first-failure-processor)
    if (failedExpect?.file && failedExpect?.line) {
      output.push(gray(`  ${failedExpect.file}:${failedExpect.line}`));
    }

    // Error message
    if (test.error || failedExpect?.error) {
      const errorMsg = test.error || failedExpect.error;
      output.push('');
      output.push(red(`  ${typeof errorMsg === 'object' ? errorMsg.message : errorMsg}`));
    }

    // Code context in a box (like first-failure-processor)
    if (failedExpect?.file && failedExpect?.line) {
      try {
        const codeSnippet = await extractCodeWindow(failedExpect.file, failedExpect.line, 5);
        if (codeSnippet) {
          output.push('');
          output.push(createBoxedCode(codeSnippet));
        }
      } catch {
        // Ignore code extraction errors
      }
    }

    // Get AI analysis if we have events
    if (testEvents.length > 0) {
      try {
        const analysis = await analyzeTestError(testEvents);
        if (analysis) {
          output.push('');
          output.push(gray('  Analysis:'));
          const analysisLines = analysis.split('\n');
          analysisLines.forEach((line) => {
            if (line.trim()) {
              output.push(gray(`  ${line}`));
            }
          });
        }
      } catch {
        // Ignore analysis errors
      }
    }

    output.push(''); // Empty line at the end
    return output.join('\n');
  }

  async gatherModuleWithReferences(moduleDir) {
    // Wait for AI.md config to get reference modules
    const aiMdConfig = await this.aiMdConfigPromise;
    const referenceModules = aiMdConfig?.referenceModules || [];

    if (referenceModules.length === 0) {
      // No reference modules, just gather normally
      return this.moduleCollector.gatherContext(moduleDir);
    }

    // Convert reference module paths to absolute paths from project root
    const projectRoot = await findProjectRoot(moduleDir);
    if (!projectRoot) {
      console.error('Could not find project root for reference modules');
      return this.moduleCollector.gatherContext(moduleDir);
    }

    const { join } = await import('path');
    const additionalModulePaths = referenceModules.map((ref) => join(projectRoot, ref));

    if (process.env.VERBLETS_DEBUG) {
      console.log('[DEBUG] Loading reference modules:', additionalModulePaths);
    }

    // Gather context with reference modules
    return this.moduleCollector.gatherContext(moduleDir, { additionalModulePaths });
  }

  async processEvent(event) {
    // Normalize event type (could be event.type or event.event)
    const eventType = event.type || event.event;

    // Uncomment for debugging event flow - DO NOT DELETE
    if (process.env.DEBUG_EVENTS) debugProcessEvent(event);

    // Skip run-start - no initial separator needed

    await super.processEvent(event);
    if (!this.enabled) return;

    // Reset state on new run
    if (eventType === 'run-start') {
      this.rendered = false;
      this.moduleContextPromise = undefined;
      this.aiMdConfigPromise = undefined;
      this.testCollector.reset();
      this.moduleCollector.reset();
    }

    // Feed event to collectors
    this.testCollector.processEvent(event);
    this.moduleCollector.processEvent(event);

    // Start async work as soon as we know the module
    if (eventType === 'test-start' && !this.moduleContextPromise) {
      const moduleDir = this.testCollector.getModuleDir();
      if (moduleDir) {
        console.log(renderAnalysisStart(moduleDir));
        // Extract AI.md config first to get reference modules
        this.aiMdConfigPromise = extractAIMdConfig(moduleDir);
        // Start module context gathering (will be updated with reference modules later)
        this.moduleContextPromise = this.gatherModuleWithReferences(moduleDir);
      }
    }

    if (eventType === 'run-end' && !this.rendered) {
      this.rendered = true;
      await this.render();
    }
  }

  async render() {
    const moduleDir = this.testCollector.getModuleDir();
    if (!moduleDir) return;

    // Get test data synchronously
    const testData = this.testCollector.getData();

    // Get events from the ringBuffer for this run
    const events = await this.getCurrentRunEvents();

    // Enrich test data with error locations from events
    if (testData?.tests) {
      for (const test of testData.tests) {
        if (!test.passed && !test.errorLocation) {
          // Find events for this test
          const testEvents =
            events?.filter(
              (e) =>
                e.testName === test.name || (e.suite === test.suite && e.testIndex === test.index)
            ) || [];

          // Find failed expectation with location
          const failedExpect = testEvents.find(
            (e) => (e.event === 'expect' || e.event === 'ai-expect') && e.passed === false
          );

          if (failedExpect?.file && failedExpect?.line) {
            test.errorLocation = `${failedExpect.file}:${failedExpect.line}`;
          }

          // Also capture error message if not already set
          if (!test.error && failedExpect?.error) {
            test.error =
              typeof failedExpect.error === 'object'
                ? failedExpect.error.message
                : failedExpect.error;
          }
        }
      }
    }

    // Wait for async data we started earlier
    const [moduleContext, aiMdConfig] = await Promise.all([
      this.moduleContextPromise || this.moduleCollector.gatherContext(moduleDir),
      this.aiMdConfigPromise || extractAIMdConfig(moduleDir),
    ]);

    // Extract intents and reference modules from AI.md config
    // Use AI.md intents if specified, otherwise use all default intents
    const intents = aiMdConfig.intents?.length > 0 ? aiMdConfig.intents : getDefaultIntents();
    const referenceModules = aiMdConfig.referenceModules || [];

    // Render synchronous views immediately with quick feedback
    console.log(renderModuleOverview(moduleContext));
    console.log('');
    console.log(renderTestSummary(testData));

    // Build context for async operations
    const context = {
      moduleDir,
      moduleContext,
      testData,
      referenceModules,
      events, // Pass events from ringBuffer for intent handlers
    };

    // Check if any tests failed and add error analysis automatically
    const failedTests = testData?.tests?.filter((t) => !t.passed) || [];
    const errorAnalysisOps = [];

    if (failedTests.length > 0) {
      // Add automatic error analysis for ONLY the first failed test
      const firstFailure = failedTests[0];
      errorAnalysisOps.push(async () => {
        const analysis = await this.analyzeTestFailure(firstFailure, events);
        return analysis;
      });
    }

    // Create async operations without pre-assigned numbers
    const intentOps = (intents ?? []).map((intent) => () => processIntent(intent, context));
    const allOps = [...errorAnalysisOps, ...intentOps];
    const totalOps = allOps.length;

    // Execute and track async operations
    if (!allOps.length) return;

    // Track completion order
    let completedCount = 0;
    const renderResult = (result) => {
      completedCount++;

      // Add progress info to result
      const progressInfo = ` (${completedCount}/${totalOps})`;

      if (typeof result === 'string') {
        // Insert progress after the title line
        const lines = result.split('\n');
        if (lines[0].includes('[MOCKED]')) {
          lines[0] = lines[0].replace('[MOCKED]', `[MOCKED]${progressInfo}`);
        } else {
          lines[0] += progressInfo;
        }
        console.log(lines.join('\n'));
      } else if (result?.render) {
        console.log(result.render());
      }
    };

    await trackAsyncProgress(
      allOps.map((op) => op()),
      renderResult
    );

    console.log('');
    console.log(createSeparator());
  }
}
