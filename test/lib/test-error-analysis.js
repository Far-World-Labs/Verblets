/**
 * Simple test error analysis - no cross-worker complexity
 */

import analyzeTestError from '../../src/chains/test-analyzer/index.js';

export function createTestErrorAnalysis(ringBuffer, config) {
  let running = false;
  const reader = ringBuffer.reader();
  
  async function processLogs() {
    if (running) return;
    running = true;
    
    try {
      while (true) {
        const result = await reader.read(100, { timeout: 500 });
        const logs = result.data || [];
        
        if (logs.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Store all logs for analysis
        if (!globalThis.allAnalysisLogs) {
          globalThis.allAnalysisLogs = [];
        }
        globalThis.allAnalysisLogs.push(...logs);
        
        // Check for suite completion
        for (const log of logs) {
          if (log.event === 'test-suite-complete' && config.modes.debugSuiteFirst) {
            await analyzeSuiteFailures(log.suite);
            return; // Exit after processing suite completion
          }
        }
      }
    } catch (error) {
      console.error('Error in test analysis:', error);
    } finally {
      running = false;
    }
  }
  
  async function analyzeSuiteFailures(suiteName) {
    // Get all logs we've collected
    const allLogs = globalThis.allAnalysisLogs || [];
    
    // Calculate suite-level stats
    const testCompleteEvents = allLogs.filter(log => log.event === 'test-complete');
    const totalTests = testCompleteEvents.length;
    const passedTests = testCompleteEvents.filter(log => log.state === 'pass').length;
    const failedTests = totalTests - passedTests;
    
    // Calculate average duration
    const testDurations = testCompleteEvents
      .filter(log => log.duration !== undefined)
      .map(log => log.duration);
    const avgDuration = testDurations.length > 0 
      ? Math.round(testDurations.reduce((a, b) => a + b, 0) / testDurations.length)
      : 0;
    
    // Output suite stats
    console.error(`\n=== SUITE STATS ===`);
    console.error(`Suite: ${suiteName}`);
    console.error(`Tests: ${passedTests}/${totalTests} passed`);
    if (failedTests > 0) {
      console.error(`Failed: ${failedTests}`);
    }
    console.error(`Avg Duration: ${avgDuration}ms`);
    console.error(`==================\n`);
    
    const failedLogs = allLogs.filter(log => 
      (log.event === 'assertion' || log.event === 'bool-result') && 
      log.passed === false
    );
    
    if (failedLogs.length === 0) {
      // Still need to resolve the promise
      if (globalThis.suiteAnalysisResolver) {
        globalThis.suiteAnalysisResolver();
        globalThis.suiteAnalysisResolver = null;
      }
      return;
    }
    
    // Analyze the first failure
    const firstFailure = failedLogs[0];
    
    try {
      const analysis = await analyzeTestError({
        testName: firstFailure.testName || 'Unknown test',
        logs: [firstFailure],
        failureDetails: firstFailure,
      });
      
      if (analysis) {
        console.error(`\n=== AI ANALYSIS ===`);
        console.error(analysis);
        console.error(`===================\n`);
      }
    } catch (error) {
      console.error('AI analysis failed:', error.message);
    } finally {
      // Resolve the suite analysis promise to unblock afterAll
      if (globalThis.suiteAnalysisResolver) {
        globalThis.suiteAnalysisResolver();
        globalThis.suiteAnalysisResolver = null;
      }
    }
  }
  
  return {
    start() {
      processLogs();
    },
  };
}