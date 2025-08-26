/**
 * Async Progress Tracker
 * Tracks and reports progress of async operations
 */

import { gray } from '../output-utils.js';

export async function trackAsyncProgress(promises, onComplete) {
  const total = promises.length;

  // Show initial status
  console.log('');
  console.log(gray(`Processing ${total} async operations...`));

  // Process results as they complete
  const results = await Promise.allSettled(
    promises.map(async (promise, _index) => {
      try {
        const result = await promise;

        console.log(''); // Space before result

        if (onComplete) {
          onComplete(result);
        }

        return result;
      } catch (error) {
        console.log('');
        console.log(`✗ Operation failed: ${error.message}`);

        throw error;
      }
    })
  );

  return results;
}
