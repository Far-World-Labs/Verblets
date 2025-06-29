import { describe, test, expect } from 'vitest';
import aiArchExpect, { fileContext, countItems } from './src/chains/ai-arch-expect/index.js';
import eachFile from './src/lib/each-file/index.js';
import eachDir from './src/lib/each-dir/index.js';
import withInactivityTimeout from './src/lib/with-inactivity-timeout/index.js';
import { runDCRule } from './src/lib/dependency-cruiser/index.js';
import { ARCH_DEBUG } from './src/constants/arch-debug.js';

// Helper function to conditionally log batch debug output
function debugBatchLog(...args) {
  if (ARCH_DEBUG.enabled) {
    console.log(...args);
  }
}

// Pre-compute counts for dynamic test titles
const dirCount = await countItems(eachDir('src/*'));
const indexFileCount = await countItems(eachFile('src/**/index.js'));
const docDirCount = await countItems(eachDir('src/{chains,verblets,lib}/*'));
const jsFileCount = await countItems(eachFile('src/**/*.js'));
const testFileCount = await countItems(eachFile('src/**/*.spec.js'));
const exampleFileCount = await countItems(eachFile('src/**/example.js'));

describe('Verblets Library Architecture', () => {
  
  test('should have well-named directories', async () => {
    await aiArchExpect(eachDir('src/*'), {
      bulkSize: 40
    })
      .satisfies('Directory name is clear and descriptive. Single words are fine. Only multi-word names need hyphens (kebab-case).')
      .start();
  }, 600000); // 10 minutes

  // Dependency Cruiser Tests - Fast and accurate
  test('should have no circular dependencies', async () => {
    await runDCRule({
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true
      }
    });
  });

  test('verblets should not import chains', async () => {
    await runDCRule({
      name: 'verblets-no-chains',
      severity: 'error',
      from: {
        path: '^src/verblets/'
      },
      to: {
        path: '^src/chains/'
      }
    });
  });

  test('lib should not import verblets or chains', async () => {
    await runDCRule({
      name: 'lib-no-verblets-chains',
      severity: 'error',
      from: {
        path: '^src/lib/'
      },
      to: {
        path: '^src/(verblets|chains)/'
      }
    });
  });

  test('should have well-structured package.json', async () => {
    await aiArchExpect(eachFile('package.json'))
      .satisfies('Package.json has proper structure, dependencies, and metadata')
      .start();
  }, 600000); // 10 minutes

  test('should have consistent code quality', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachFile('src/**/*.js'), {
          maxFailures: 5
        })
          .withContext(fileContext('guidelines/CODE_QUALITY.md', 'code-quality-guidelines'))
          .withContext(fileContext('src/chains/DESIGN.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/DESIGN.md', 'verblet-guidelines'))
          .withContext(fileContext('guidelines/ARCHITECTURE_TESTS.md', 'architecture-testing-guidelines'))
          .satisfies(`File follows appropriate code quality standards based on its file type and purpose. 

Apply context-specific expectations from the guidelines. Focus on practical code quality over perfect adherence to abstract principles.`);
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          debugBatchLog(`[quality ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes

  test('should have well-structured test files', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachFile('src/**/*.spec.js'), {
          maxFailures: 5
        })
          .withContext(fileContext('guidelines/UNIT_TESTS.md', 'unit-test-guidelines'))
          .withContext(fileContext('src/chains/DESIGN.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/DESIGN.md', 'verblet-guidelines'))
          .satisfies('Test file follows unit testing best practices based on the module type and guidelines. Focus on practical testing patterns appropriate for the code being tested.');
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          debugBatchLog(`[test-files ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes

  test('should have compelling example files', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachDir('src/{chains,verblets}/*'), {
          bulkSize: 8,
          maxFailures: 3
        })
          .withContext(fileContext('guidelines/EXAMPLE_TESTS.md', 'example-guidelines'))
          .withContext(fileContext('src/chains/DESIGN.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/DESIGN.md', 'verblet-guidelines'))
          .withItemContext(dir => fileContext(`${dir}/index.examples.js`, 'example'))
          .satisfies('When index.examples.js exists, it should contain compelling, relatable examples and be structured as a Vitest test suite. Should demonstrate real-world usage without mocking LLM calls.');
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          debugBatchLog(`[examples ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes


  test('should have high-quality README documentation', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachDir('src/{chains,verblets,lib}/*'), {
          maxFailures: 5
        })
          .withContext(fileContext('README.md', 'project-readme'))
          .withContext(fileContext('src/chains/DESIGN.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/DESIGN.md', 'verblet-guidelines'))
          .withItemContext(dir => fileContext(`${dir}/README.md`, 'readme'))
          .satisfies('When README.md exists, it should contain appropriate documentation based on module type and complexity guidelines.');
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          debugBatchLog(`[readme ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes

  test('should have adequate documentation coverage', async () => {
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachDir('src/{chains,verblets,lib}/*'), {
          maxFailures: 5
        })
          .withContext(fileContext('src/chains/DESIGN.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/DESIGN.md', 'verblet-guidelines'))
          .coverage(0.25)
          .satisfies('Directory has appropriate documentation based on module complexity and guidelines. Simple modules may not need README files.');
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          debugBatchLog(`[doc-coverage ${metadata.chunkIndex}/${metadata.totalChunks}] ${status}: [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes
});
