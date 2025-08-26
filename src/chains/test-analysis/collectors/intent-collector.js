/**
 * Intent Collector
 * Extracts intents from AI.md files
 */

import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';

export class IntentCollector {
  async extractIntents(moduleDir) {
    const aiMdPath = join(moduleDir, 'AI.md');

    // Check if file exists
    try {
      await access(aiMdPath, constants.R_OK);
    } catch {
      return [];
    }

    const content = await readFile(aiMdPath, 'utf-8');

    // Find Test Focus section
    const lines = content.split('\n');
    const testFocusIndex = lines.findIndex(
      (line) => line.includes('Test Focus') && line.startsWith('#')
    );

    if (testFocusIndex === -1) return [];

    // Collect bullet points after Test Focus
    const intents = [];
    for (let i = testFocusIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Stop at next section header
      if (line.startsWith('#')) break;

      // Extract bullet points
      if (line.startsWith('-') || line.startsWith('*')) {
        const intent = line.substring(1).trim();
        if (intent) intents.push(intent);
      }
    }

    return intents;
  }
}
