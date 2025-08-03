// A completely silent Vitest reporter
// All test output comes from our RingBuffer consumer
export default class SilentReporter {
  onInit() {}
  onPathsCollected() {}
  onCollected() {}
  onTaskUpdate() {}
  onTestRemoved() {}
  onWatcherStart() {}
  onWatcherRerun() {}
  onServerRestart() {}
  onUserConsoleLog(log) {
    // Allow console.error to pass through for debugging
    if (log.type === 'stderr') {
      process.stderr.write(log.content);
    }
  }
  onProcessTimeout() {}
  
  async onFinished(files, errors) {
    // Exit with appropriate code but no output
    if (errors?.length) {
      process.exit(1);
    }
  }
}