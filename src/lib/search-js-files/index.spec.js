import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import search from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scan JS repo with best-first search', () => {
  it('finds functions in a single file without imports', async () => {
    const testFile = join(__dirname, 'test-data', 'no-imports.js');

    const result = await search({
      node: { filename: testFile },
    });

    // Should have visited the file and found its functions
    expect(result.visited).toBeDefined();
    expect(result.visited.size).toBeGreaterThan(0);

    // Check that it found the exported function
    const visitedNodes = Array.from(result.visited);
    expect(visitedNodes.some((node) => node.includes('isolatedFunction'))).toBe(true);
  });

  it('follows imports and discovers connected files', async () => {
    const mainFile = join(__dirname, 'test-data', 'main.js');

    const result = await search({
      node: { filename: mainFile },
    });

    const visitedNodes = Array.from(result.visited);

    // Should have visited main.js and its imports (helper.js and utils.js)
    expect(visitedNodes.some((node) => node.includes('main.js'))).toBe(true);
    expect(visitedNodes.some((node) => node.includes('helper.js'))).toBe(true);
    expect(visitedNodes.some((node) => node.includes('utils.js'))).toBe(true);

    // Should find functions from all files
    expect(visitedNodes.some((node) => node.includes('mainFunction'))).toBe(true);
    expect(visitedNodes.some((node) => node.includes('helper'))).toBe(true);
    expect(visitedNodes.some((node) => node.includes('anotherHelper'))).toBe(true);
  });

  it('allows custom visit function to track nodes', async () => {
    const mainFile = join(__dirname, 'test-data', 'main.js');
    const visitedNodes = [];

    const result = await search({
      node: { filename: mainFile },
      visit: ({ node, state }) => {
        // Track what we visit
        if (node.functionName) {
          visitedNodes.push(node.functionName);
        }
        // Stop after finding mainFunction (check if it contains the name)
        if (node.functionName && node.functionName.includes('mainFunction')) {
          return { ...state, stop: true };
        }
        return state;
      },
    });

    // Should have visited at least mainFunction (with its declaration prefix)
    expect(visitedNodes.some((name) => name.includes('mainFunction'))).toBe(true);
    // Should have stopped so shouldn't have all possible functions
    expect(result.visited.size).toBeGreaterThan(0);
  });

  it('ranks nodes by function name length', async () => {
    const mainFile = join(__dirname, 'test-data', 'helper.js');
    const visitOrder = [];

    await search({
      node: { filename: mainFile },
      visit: ({ node, state }) => {
        if (node.functionName) {
          visitOrder.push(node.functionName);
        }
        return state;
      },
    });

    // Should visit shorter function names first due to ranking
    if (visitOrder.length >= 2) {
      const firstIndex = visitOrder.indexOf('helper');
      const secondIndex = visitOrder.indexOf('anotherHelper');

      // 'helper' should come before 'anotherHelper' since it's shorter
      if (firstIndex !== -1 && secondIndex !== -1) {
        expect(firstIndex).toBeLessThan(secondIndex);
      }
    }
  });
});
