/**
 * Run Separator Processor
 *
 * Displays a visual separator between test runs in watch mode.
 * Helps distinguish between reruns triggered by 'r', Enter, or file changes.
 */

import { BaseProcessor } from './base-processor.js';
import { createSeparator } from '../output-utils.js';

function isWatchMode() {
  const hasRunFlag = process.argv.includes('--run');
  const isCI = process.env.CI === 'true';
  const hasWatchFlag = process.argv.includes('--watch');
  const vitestMode = process.env.VITEST_MODE === 'WATCH';

  return hasWatchFlag || vitestMode || (!hasRunFlag && !isCI);
}

export class RunSeparatorProcessor extends BaseProcessor {
  constructor(options = {}) {
    super({
      name: 'RunSeparator',
      alwaysEnabled: true,
      processAsync: true, // Need this to process ring buffer events
      ...options,
    });

    this.hasSeenRun = false;
    this.lastRunId = null;
  }

  handleRunStart(event) {
    // Check if this is a different run from the last one we saw
    const isNewRun = event.runId !== this.lastRunId;

    // Only show separator if we've seen a run before and this is a new one
    if (isWatchMode() && this.hasSeenRun && isNewRun) {
      console.log(`\n${createSeparator(undefined, '═')}\n`);
    }

    this.hasSeenRun = true;
    this.lastRunId = event.runId;
  }

  handleRunEnd() {
    // Mark that we've completed a run
    // This ensures separator shows on next run-start
    this.hasSeenRun = true;
  }
}
