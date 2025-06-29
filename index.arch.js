import { describe, test, expect } from 'vitest';
import aiArchExpect, { fileContext, countItems } from './src/chains/ai-arch-expect/index.js';
import eachFile from './src/lib/each-file/index.js';
import eachDir from './src/lib/each-dir/index.js';
import withInactivityTimeout from './src/lib/with-inactivity-timeout/index.js';
import { runDCRule } from './arch-dc.js';

// Pre-compute counts for dynamic test titles
const dirCount = await countItems(eachDir('src/*'));
const indexFileCount = await countItems(eachFile('src/**/index.js'));
const docDirCount = await countItems(eachDir('src/{chains,verblets,lib}/*'));
const jsFileCount = await countItems(eachFile('src/**/*.js'));
const testFileCount = await countItems(eachFile('src/**/*.spec.js'));

describe('Verblets Library Architecture', () => {
  
  test('should have well-named directories', async () => {
    await aiArchExpect(eachDir('src/*'))
      .withBulkSize(40)
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

  // Slow tests with timeout and chunk processing
  test('should have proper exports in index files', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachFile('src/**/index.js'))
          .withBulkSize(20)
          .satisfies('Index file has appropriate exports for its purpose. Simple re-export files are acceptable. Focus on proper module structure rather than perfect export patterns.');
        
        expectation.maxFailures = 3;
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[exports ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
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
        const expectation = aiArchExpect(eachDir('src/{chains,verblets,lib}/*'))
          .withContext(fileContext('src/chains/CHAIN_MODULES.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/VERBLET_MODULES.md', 'verblet-guidelines'))
          .assertCoverage('Directory has appropriate documentation based on module complexity and guidelines. Simple modules may not need README files.', 0.25);
        
        expectation.maxFailures = 5;
        expectation.onChunkProcessed = (items, error, metadata) => {
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[doc-coverage ${metadata.chunkIndex}/${metadata.totalChunks}] ${status}: [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
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
        const expectation = aiArchExpect(eachDir('src/{chains,verblets,lib}/*'))
          .withContext(fileContext('README.md', 'project-readme'))
          .withContext(fileContext('src/chains/CHAIN_MODULES.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/VERBLET_MODULES.md', 'verblet-guidelines'))
          .withItemContext(dir => fileContext(`${dir}/README.md`, 'readme'))
          .satisfies('When README.md exists, it should contain appropriate documentation based on module type and complexity guidelines.');
        
        expectation.maxFailures = 5;
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[readme ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes

  test('should have well-structured package.json', async () => {
    await aiArchExpect(eachFile('package.json'))
      .withContext(fileContext('package.json'))
      .satisfies('Package.json has proper structure, dependencies, and metadata')
      .start();
  }, 600000); // 10 minutes

  test('should have consistent code quality', async () => {
    const startTime = Date.now();
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachFile('src/**/*.js'))
          .withContext(fileContext('guidelines/CODE_QUALITY.md', 'code-quality-guidelines'))
          .satisfies(`File follows appropriate code quality standards based on its file type and purpose. 

File Type Classification:
- src/prompts/*.js = Prompt utilities (simple string templating functions)
- src/lib/*.js = Library utilities (reusable helper functions)  
- src/verblets/*.js = Verblet modules (LLM-aware functions)
- src/chains/*.js = Chain modules (complex AI workflows)
- Config files = Actual configuration files (not utility functions)

Apply context-specific expectations from the guidelines. Focus on practical code quality over perfect adherence to abstract principles.`);
        
        expectation.maxFailures = 5;
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[quality ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes

  test('should follow logical library organization', async () => {
    await withInactivityTimeout(
      async (onUpdate) => {
        const expectation = aiArchExpect(eachDir('src/*'))
          .withBulkSize(40)
          .satisfies('Directory structure follows logical organization with clear separation of concerns. Consider the purpose and scale of each directory.');
        
        expectation.onChunkProcessed = (items, error, metadata) => {
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[organization ${metadata.chunkIndex}/${metadata.totalChunks}] ${status}: [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
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
        const expectation = aiArchExpect(eachFile('src/**/*.spec.js'))
          .withContext(fileContext('guidelines/UNIT_TESTS.md', 'unit-test-guidelines'))
          .withContext(fileContext('src/chains/CHAIN_MODULES.md', 'chain-guidelines'))
          .withContext(fileContext('src/verblets/VERBLET_MODULES.md', 'verblet-guidelines'))
          .satisfies('Test file follows unit testing best practices based on the module type and guidelines. Focus on practical testing patterns appropriate for the code being tested.');
        
        expectation.maxFailures = 5;
        expectation.onChunkProcessed = (items, error, metadata) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const status = error ? 'FAIL' : 'PASS';
          const itemsStr = (metadata.formattedItems || items).join(', ');
          console.log(`[test-files ${metadata.chunkIndex}/${metadata.totalChunks}] ${status} (${elapsed}s): [${itemsStr}]${error ? ` - ${error.message}` : ''}`);
          onUpdate(items, error);
        };
        
        return await expectation.start();
      },
      10000
    );
  }, 600000); // 10 minutes
});
