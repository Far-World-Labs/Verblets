/**
 * First Failure Processor
 *
 * Reports the first test failure in each suite immediately when it occurs.
 * Includes AI analysis of the failure for debugging assistance.
 */

import { BaseProcessor } from './base-processor.js';
import analyzeTestError from '../../test-analyzer/index.js';
import { extractCodeWindow } from '../../../lib/code-extractor/index.js';
import { getConfig } from '../config.js';
import { gray, red, badges, createBoxedCode } from '../output-utils.js';

// Pure helpers
const isTestComplete = (event) => event.event === 'test-complete';
const isFailedTest = (event) => isTestComplete(event) && event.state === 'fail';

export class FirstFailureProcessor extends BaseProcessor {
  constructor(options = {}) {
    const config = getConfig();
    super({
      name: 'FirstFailure',
      // No envFlag needed - we control it via alwaysEnabled
      alwaysEnabled: config?.aiMode === true, // Enable when in AI mode
      processAsync: true, // Need this to poll for events!
      ...options,
    });

    // Track first failures per suite
    this.reportedFailures = new Set();
  }

  onInitialize() {
    if (!this.enabled) return;
  }

  // Event handlers

  handleRunStart() {
    // Reset on new run
    this.reportedFailures.clear();
  }

  handleSuiteStart(event) {
    // Clear suite's failure tracking on restart
    const key = this.getSuiteKey(event.suite);
    this.reportedFailures.delete(key);
  }

  async handleTestComplete(event) {
    if (!isFailedTest(event)) return;

    const key = this.getSuiteKey(event.suite);
    if (this.reportedFailures.has(key)) return;

    // Mark as reported
    this.reportedFailures.add(key);

    // Wait for events to be written to ring buffer
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Analyze the failure
    await this.analyzeAndReport(event);
  }

  // Analysis methods

  async analyzeAndReport(event) {
    // Get events for this test - if none found, fallback to raw lookback
    let testEvents = await this.getTestEvents(event.suite, event.testIndex);

    if (testEvents.length === 0) {
      // Fallback: look for events by suite and test name
      const rawEvents = await this.lookback(100);
      testEvents = rawEvents.filter(
        (e) =>
          e.suite === event.suite &&
          (e.testIndex === event.testIndex || e.testName === event.testName)
      );
    }

    // Find failed expectation
    const failedExpect = testEvents.find(
      (e) => (e.event === 'expect' || e.event === 'ai-expect') && e.passed === false
    );

    if (!failedExpect?.file) {
      // No location info, just report basic failure
      const viewModel = this.getBasicFailureViewModel(event);
      this.renderFailure(viewModel);
      return;
    }

    // Extract code context
    const codeSnippet = await extractCodeWindow(failedExpect.file, failedExpect.line, 5);

    // Get AI analysis
    const analysis = await analyzeTestError(testEvents);

    // Build view model with analysis
    const viewModel = await this.getAnalysisViewModel(event, failedExpect, codeSnippet, analysis);

    // Render with analysis
    this.renderFailureWithAnalysis(viewModel);
  }

  // Helper methods

  getSuiteKey(suiteName) {
    return `suite:${suiteName}`;
  }

  // ViewModels

  getBasicFailureViewModel(event) {
    return {
      suite: event.suite,
      testName: event.testName,
      error: event.error?.message || event.error,
      hasAnalysis: false,
    };
  }

  async getAnalysisViewModel(event, failedExpect, codeSnippet, analysis) {
    // Get test name from test-start event if available
    const testEvents = await this.getTestEvents(event.suite, event.testIndex);
    const testStart = testEvents.find((e) => e.event === 'test-start');
    const testName = testStart?.testName || event.testName;

    return {
      suite: event.suite,
      testName,
      file: failedExpect.file,
      line: failedExpect.line,
      error: failedExpect.error || event.error?.message || event.error,
      codeSnippet,
      analysis,
      hasAnalysis: true,
    };
  }

  // View Components

  renderHeader(suite, testName) {
    console.log('');
    console.log(`${badges.fail()}  ${suite}`);
    console.log(`  ${testName}`);
  }

  renderLocation(file, line) {
    if (!file || !line) return;
    console.log(gray(`  ${file}:${line}`));
  }

  renderError(error) {
    if (!error) return;
    console.log('');
    console.log(red(`  ${error}`));
  }

  renderCodeSnippet(snippet) {
    if (!snippet) return;
    console.log('');

    // createBoxedCode will handle the highlighting internally
    console.log(createBoxedCode(snippet));
  }

  renderAnalysis(analysis) {
    if (!analysis) return;
    console.log('');
    console.log(gray('  Analysis:'));

    // Split analysis by lines and render
    const lines = analysis.split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(gray(`  ${line}`));
      }
    });
  }

  // Main view composers

  renderFailure(viewModel) {
    const { suite, testName, error } = viewModel;

    this.renderHeader(suite, testName);
    this.renderError(error);
    console.log('');
  }

  renderFailureWithAnalysis(viewModel) {
    const { suite, testName, file, line, error, codeSnippet, analysis } = viewModel;

    this.renderHeader(suite, testName);
    this.renderLocation(file, line);
    this.renderError(error);
    this.renderCodeSnippet(codeSnippet);
    this.renderAnalysis(analysis);
    console.log('');
  }
}
