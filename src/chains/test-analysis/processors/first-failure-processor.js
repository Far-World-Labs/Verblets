/**
 * First Failure Processor
 *
 * Reports the first test failure in each suite immediately when it occurs.
 * Includes AI analysis of the failure for debugging assistance.
 */

import { BaseProcessor } from './base-processor.js';
import analyzeTestError from '../../test-analyzer/index.js';
import { extractCodeWindow } from '../../../lib/code-extractor/index.js';

// Pure helpers
const isTestComplete = (event) => event.event === 'test-complete';
const isFailedTest = (event) => isTestComplete(event) && event.state === 'fail';

export class FirstFailureProcessor extends BaseProcessor {
  constructor(options = {}) {
    super({
      name: 'FirstFailure',
      envFlag: 'VERBLETS_FIRST_FAILURE',
      ...options,
    });

    // Track first failures per suite
    this.reportedFailures = new Set();
  }

  onInitialize() {
    if (!this.enabled) return;
    console.log(
      '[FirstFailure] Processor enabled - will report first failure per suite with AI analysis'
    );
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

    // Analyze the failure
    await this.analyzeAndReport(event);
  }

  // Analysis methods

  async analyzeAndReport(event) {
    // Get all test events for context
    const testEvents = await this.getTestEvents(event.suite, event.testIndex);

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
    const viewModel = this.getAnalysisViewModel(event, failedExpect, codeSnippet, analysis);

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

  getAnalysisViewModel(event, failedExpect, codeSnippet, analysis) {
    // Get test name from test-start event if available
    const testEvents = this.getTestEvents(event.suite, event.testIndex);
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

  renderBoxLine(content = '') {
    console.log(`│${content}`);
  }

  renderBoxContent(text, indent = 2) {
    const padding = ' '.repeat(indent);
    this.renderBoxLine(`${padding}${text}`);
  }

  renderHeader(suite) {
    this.renderBoxContent(`⚠️  First failure in ${suite}`);
  }

  renderTestInfo(testName, file, line) {
    this.renderBoxContent(`Test: ${testName}`, 5);
    if (file && line) {
      this.renderBoxContent(`at ${file}:${line}`, 5);
    }
  }

  renderError(error) {
    if (!error) return;
    this.renderBoxContent(`Error: ${error}`, 5);
  }

  renderCodeSnippet(snippet) {
    if (!snippet) return;

    this.renderBoxContent('');
    this.renderBoxContent('Code context:', 5);

    snippet.split('\n').forEach((line) => {
      this.renderBoxContent(line, 7);
    });
  }

  renderAnalysis(analysis) {
    if (!analysis) return;

    this.renderBoxContent('');
    this.renderBoxContent('AI Analysis:', 5);

    // Split analysis by lines and render
    const lines = analysis.split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        this.renderBoxContent(line, 7);
      }
    });
  }

  // Main view composers

  renderFailure(viewModel) {
    const { suite, testName, error } = viewModel;

    // Start box
    console.log(`\n│`);

    // Content
    this.renderHeader(suite);
    this.renderBoxContent(`Test: ${testName}`, 5);
    this.renderError(error);

    // End box
    this.renderBoxLine();
    console.log(`\n`);
  }

  renderFailureWithAnalysis(viewModel) {
    const { suite, testName, file, line, error, codeSnippet, analysis } = viewModel;

    // Start box
    console.log(`\n│`);

    // Content
    this.renderHeader(suite);
    this.renderTestInfo(testName, file, line);
    this.renderError(error);
    this.renderCodeSnippet(codeSnippet);
    this.renderAnalysis(analysis);

    // End box
    this.renderBoxLine();
    console.log(`\n`);
  }
}
