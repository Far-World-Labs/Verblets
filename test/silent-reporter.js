// A completely silent Vitest reporter that outputs nothing to stdout
// but sends suite information to our logger
export default class SilentReporter {
  onInit() {
    // Output initial separator
    const terminalWidth = process.stdout.columns || 76;
    const separator = '─'.repeat(terminalWidth);
    process.stderr.write(separator + '\n');
  }
  onPathsCollected() {}
  onCollected() {}
  
  onTaskUpdate(packs) {
    // Send suite information to our logger
    const logger = globalThis.testLogger;
    
    packs.forEach(([id, task]) => {
      // Log all test completions as well
      if (task.type === 'test' && task.result?.state) {
        const suiteName = task.suite?.name || 'Unknown Suite';
        if (!this.suiteStats) {
          this.suiteStats = new Map();
        }
        
        if (!this.suiteStats.has(suiteName)) {
          this.suiteStats.set(suiteName, { passed: 0, failed: 0, total: 0, duration: 0 });
        }
        
        const stats = this.suiteStats.get(suiteName);
        stats.total++;
        stats.duration += task.result.duration || 0;
        
        if (task.result.state === 'pass') {
          stats.passed++;
        } else if (task.result.state === 'fail') {
          stats.failed++;
        }
      }
      
      if (task.type === 'suite' && task.name && task.result?.state) {
        // Suite completed - emit summary
        const stats = this.suiteStats?.get(task.name) || { passed: 0, failed: 0, total: 0, duration: task.result.duration || 0 };
        
        // Don't output here - we'll output all at once in onFinished
      }
    });
  }
  
  onTestRemoved() {}
  onWatcherStart() {}
  onWatcherRerun() {}
  onServerRestart() {}
  onUserConsoleLog(log) {
    // Allow console.error to pass through
    if (log.type === 'stderr') {
      process.stderr.write(log.content);
    }
  }
  onProcessTimeout() {}
  
  // The only output we want is exit code
  async onFinished(files, errors) {
    const logger = globalThis.testLogger;
    
    // Output summaries for all non-bool suites
    if (this.suiteStats && this.suiteStats.size > 0) {
      const terminalWidth = process.stdout.columns || 76;
      const separator = '─'.repeat(terminalWidth);
      
      for (const [suiteName, stats] of this.suiteStats) {
        // Skip Bool verblet - it has its own output
        if (suiteName === 'Bool verblet') continue;
        
        if (stats.failed === 0) {
          // Passing suite - one line
          const status = '✓';
          const suiteNameFormatted = (suiteName + ' ' + status).padEnd(40).substring(0, 40);
          const statsStr = `${stats.passed}/${stats.total} passed`.padEnd(15);
          const durationStr = `${Math.round(stats.duration)}ms`.padStart(8);
          
          process.stderr.write(`\n│ ${suiteNameFormatted} ${statsStr} ${durationStr}\n${separator}\n`);
        } else {
          // Failing suite
          const status = '✗';
          const suiteNameFormatted = (suiteName + ' ' + status).padEnd(40).substring(0, 40);
          const statsStr = `${stats.passed}/${stats.total} passed`.padEnd(15);
          const durationStr = `${Math.round(stats.duration)}ms`.padStart(8);
          
          process.stderr.write(`\n│ ${suiteNameFormatted} ${statsStr} ${durationStr}\n│ ${stats.failed} test(s) failed\n${separator}\n`);
        }
      }
    }
    
    if (errors?.length) {
      process.exit(1);
    }
  }
}