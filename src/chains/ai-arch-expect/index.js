import fs from 'fs';
import path from 'path';
import { expect } from 'vitest';
import chatgpt from '../../lib/chatgpt/index.js';
import reduce from '../reduce/index.js';

// Re-export utilities for backwards compatibility
export { default as eachFile } from '../../lib/each-file/index.js';
export { default as eachDir } from '../../lib/each-dir/index.js';

// Context builders
export const fileContext = (filePath, name = path.basename(filePath)) => ({
  type: 'file',
  filePath,
  name,
});
export const jsonContext = (
  filePath,
  fields = undefined,
  name = path.basename(filePath, '.json')
) => ({ type: 'json', filePath, fields, name });
export const dataContext = (data, name) => ({ type: 'data', data, name });

// Helper to list directory contents
export function listDir(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return [];
  return fs.readdirSync(dirPath).map((item) => ({
    name: item,
    path: path.join(dirPath, item),
    isDirectory: fs.statSync(path.join(dirPath, item)).isDirectory(),
  }));
}

// Helper to count items
export async function countItems(target) {
  const items = await target.resolve();
  return items.length;
}

// Helper to clean JSON response from markdown
function parseJsonResponse(response) {
  let jsonStr = response;

  // Remove markdown code blocks if present
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (match) {
      jsonStr = match[1];
    }
  }

  return JSON.parse(jsonStr.trim());
}

// JSON schemas for structured responses
const resultSchema = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['passed', 'reason'],
};

const bulkResultSchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          passed: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['path', 'passed', 'reason'],
      },
    },
  },
  required: ['results'],
};

function resolveContext(ctx) {
  switch (ctx.type) {
    case 'file': {
      return fs.existsSync(ctx.filePath)
        ? `<${ctx.name}>\n${fs.readFileSync(ctx.filePath, 'utf8')}\n</${ctx.name}>`
        : '';
    }
    case 'json': {
      if (!fs.existsSync(ctx.filePath)) return '';
      const data = JSON.parse(fs.readFileSync(ctx.filePath, 'utf8'));
      const content = ctx.fields ? pickFields(data, ctx.fields) : data;
      return `<${ctx.name}>\n${JSON.stringify(content, undefined, 2)}\n</${ctx.name}>`;
    }
    case 'data': {
      const dataStr =
        typeof ctx.data === 'string' ? ctx.data : JSON.stringify(ctx.data, undefined, 2);
      return `<${ctx.name}>\n${dataStr}\n</${ctx.name}>`;
    }
    default:
      return '';
  }
}

function pickFields(obj, fields) {
  const result = {};
  fields.forEach((field) => {
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = obj;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value !== undefined) result[field] = value;
    } else if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  });
  return result;
}

function getItemContent(item) {
  if (!fs.existsSync(item)) return 'Item does not exist';
  const stats = fs.statSync(item);
  if (stats.isDirectory()) {
    return fs.readdirSync(item).join(', ');
  } else {
    const content = fs.readFileSync(item, 'utf8');
    return content.length > 8000 ? `${content.substring(0, 8000)}\n... (truncated)` : content;
  }
}

function buildPrompt(contextText, item, description, isFile) {
  const content = getItemContent(item);
  return `${contextText}
Analyze this ${isFile ? 'file' : 'directory'}: ${item}

Content:
${content}

Does it satisfy: "${description}"?

Return JSON with "passed" (boolean) and "reason" (string).`;
}

function buildBulkPrompt(contextText, items, description) {
  return `${contextText}
Analyze each item and determine if it satisfies: "${description}"
Items: ${items.join(', ')}

Return JSON with "results" array containing objects with "path", "passed" (boolean), and "reason" (string).`;
}

// Main expectation class
class ArchExpectation {
  constructor(target, options = {}) {
    this.target = target;
    this.contexts = [];
    this.itemContextFns = [];
    this.maxFailures = options.maxFailures || 1;
    this.bulkSize = options.bulkSize || 20; // Default bulk size
    this.onChunkProcessed = undefined;
    this.description = undefined;
    this.threshold = undefined;
    this.isCoverageTest = false;
  }

  withContext(ctx) {
    this.contexts.push(ctx);
    return this;
  }

  withItemContext(ctxFn) {
    this.itemContextFns.push(ctxFn);
    return this;
  }

  // Set bulk size for processing
  withBulkSize(size) {
    this.bulkSize = size;
    return this;
  }

  // Set up for a satisfies test
  satisfies(description) {
    this.description = description;
    // Don't reset isCoverageTest - coverage tests can have satisfies descriptions
    return this;
  }

  // Set up for a coverage test
  assertCoverage(description, threshold = 0.5) {
    this.description = description;
    this.threshold = threshold;
    this.isCoverageTest = true;
    return this;
  }

  // Start processing - this is the fluent terminator
  async start() {
    if (!this.description) {
      throw new Error('Must call satisfies() or assertCoverage() before start()');
    }

    const items = await this.target.resolve();
    const contextText = this.contexts.map(resolveContext).filter(Boolean).join('\n\n');

    if (this.isCoverageTest) {
      return this.processCoverage(items, contextText);
    } else {
      return this.processExpectation(items, contextText);
    }
  }

  processExpectation(items, contextText) {
    // Determine processing strategy
    const shouldUseIndividual =
      this.onChunkProcessed || this.itemContextFns.length > 0 || items.length <= 5;

    if (shouldUseIndividual) {
      return this.processIndividually(items, contextText);
    } else {
      return this.processBulk(items, contextText);
    }
  }

  async processCoverage(items, contextText) {
    // Coverage always processes individually to get all results
    const originalMaxFailures = this.maxFailures;
    this.maxFailures = items.length; // Allow all items to be processed

    try {
      const results = await this.processIndividually(items, contextText);

      const passed = results.details.passed;
      const coverage = items.length > 0 ? passed / items.length : 0;
      const coveragePassed = coverage >= this.threshold;

      const message = `Coverage: ${passed}/${items.length} (${(coverage * 100).toFixed(1)}%) - ${
        coveragePassed ? 'meets' : 'below'
      } ${(this.threshold * 100).toFixed(1)}% threshold`;

      if (!coveragePassed) {
        expect.fail(message);
      }

      return { passed: coveragePassed, coverage, message };
    } finally {
      this.maxFailures = originalMaxFailures;
    }
  }

  async processIndividually(items, contextText) {
    const results = [];
    let failures = 0;
    const concurrency = 5; // Reduced parallel requests for individual processing
    let chunkIndex = 0;
    const totalChunks = Math.ceil(items.length / concurrency);

    // Process items in parallel batches
    for (let i = 0; i < items.length; i += concurrency) {
      if (failures >= this.maxFailures) {
        break;
      }

      const batch = items.slice(i, i + concurrency);
      chunkIndex++;

      // Call chunk callback at start of processing if provided
      if (this.onChunkProcessed) {
        this.onChunkProcessed(batch, undefined, {
          chunkIndex,
          totalChunks,
          itemsInChunk: batch.length,
          totalItems: items.length,
          status: 'processing',
        });
      }

      const batchPromises = batch.map(async (item) => {
        try {
          const itemContextText = this.itemContextFns
            .map((fn) => resolveContext(fn(item)))
            .filter(Boolean)
            .join('\n\n');
          const fullContext = [contextText, itemContextText].filter(Boolean).join('\n\n');
          const prompt = buildPrompt(
            fullContext,
            item,
            this.description,
            this.target.type === 'files'
          );

          const response = await chatgpt(prompt, {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'arch_result',
                schema: resultSchema,
              },
            },
          });

          const result = typeof response === 'string' ? parseJsonResponse(response) : response;
          return { item, ...result, error: undefined };
        } catch (error) {
          return { item, passed: false, reason: `Analysis failed: ${error.message}`, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchErrors = [];

      for (const result of batchResults) {
        results.push(result);

        if (!result.passed) {
          failures++;
          batchErrors.push(result.error || new Error(result.reason));
        }

        // Stop if we've hit max failures
        if (failures >= this.maxFailures) {
          break;
        }
      }

      // Call chunk callback at end of processing if provided
      if (this.onChunkProcessed) {
        const hasErrors = batchErrors.length > 0;
        this.onChunkProcessed(batch, hasErrors ? batchErrors[0] : undefined, {
          chunkIndex,
          totalChunks,
          itemsInChunk: batch.length,
          totalItems: items.length,
          status: 'completed',
          passed: batchResults.filter((r) => r.passed).length,
          failed: batchErrors.length,
        });
      }
    }

    return this.summarize(items, results);
  }

  async processBulk(items, contextText) {
    // Determine chunk size based on description complexity and bulk size setting
    const isSimpleTest = /\b(name|naming|hyphen|kebab|case|convention|clear|descriptive)\b/i.test(
      this.description
    );
    const chunkSize = isSimpleTest ? Math.max(this.bulkSize, 40) : this.bulkSize;

    const allResults = [];
    let chunkIndex = 0;
    const totalChunks = Math.ceil(items.length / chunkSize);

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      chunkIndex++;

      // Call chunk callback at start of processing if provided
      if (this.onChunkProcessed) {
        this.onChunkProcessed(chunk, undefined, {
          chunkIndex,
          totalChunks,
          itemsInChunk: chunk.length,
          totalItems: items.length,
          status: 'processing',
        });
      }

      try {
        // Use reduce for bulk processing
        const prompt = buildBulkPrompt(contextText, chunk, this.description);
        const response = await reduce(chunk, prompt, {
          modelOptions: {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'arch_bulk_result',
                schema: bulkResultSchema,
              },
            },
          },
        });

        // Parse results
        let parsedResults = [];
        try {
          const parsed = typeof response === 'string' ? parseJsonResponse(response) : response;
          const resultArray = parsed.results || parsed;
          if (Array.isArray(resultArray)) {
            parsedResults = resultArray;
          } else {
            // If we don't get an array, create failure results for this chunk
            parsedResults = chunk.map((item) => ({
              path: item,
              passed: false,
              reason: 'Invalid response format',
            }));
          }
        } catch (parseError) {
          // If parsing fails, create failure results for this chunk
          parsedResults = chunk.map((item) => ({
            path: item,
            passed: false,
            reason: `Parse error: ${parseError.message}`,
          }));
        }

        allResults.push(...parsedResults);

        // Call chunk callback at end of processing if provided
        if (this.onChunkProcessed) {
          const failed = parsedResults.filter((r) => !r.passed).length;
          const passed = parsedResults.length - failed;
          this.onChunkProcessed(
            chunk,
            failed > 0 ? new Error(`${failed} items failed`) : undefined,
            {
              chunkIndex,
              totalChunks,
              itemsInChunk: chunk.length,
              totalItems: items.length,
              status: 'completed',
              passed,
              failed,
            }
          );
        }
      } catch (error) {
        // Call chunk callback for error if provided
        if (this.onChunkProcessed) {
          this.onChunkProcessed(chunk, error, {
            chunkIndex,
            totalChunks,
            itemsInChunk: chunk.length,
            totalItems: items.length,
            status: 'error',
          });
        }
        throw error;
      }
    }

    return this.summarize(
      items,
      allResults.map((r) => ({
        item: r.path,
        passed: r.passed,
        reason: r.reason,
      }))
    );
  }

  summarize(allItems, results) {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const allPassed = failed === 0;
    const stoppedEarly = results.length < allItems.length;
    const failures = results.filter((r) => !r.passed);

    let message;
    if (allPassed) {
      message = `All ${results.length}/${allItems.length} items satisfy: ${this.description}`;
    } else {
      const failureDetails = failures
        .slice(0, 5)
        .map((f) => `  • ${f.item}: ${f.reason || 'Failed'}`)
        .join('\n');
      const moreFailures =
        failures.length > 5 ? `\n  ... and ${failures.length - 5} more failures` : '';

      message = `${failed}/${results.length} items failed: ${this.description}${
        stoppedEarly && this.maxFailures !== 1
          ? ` (stopped after ${this.maxFailures} failures)`
          : ''
      }\n\nFailures:\n${failureDetails}${moreFailures}`;
    }

    if (!allPassed) {
      expect.fail(message);
    }

    return {
      passed: allPassed,
      message,
      details: {
        total: allItems.length,
        processed: results.length,
        passed,
        failed,
        failures,
      },
    };
  }
}

export function aiArchExpect(target, options = {}) {
  return new ArchExpectation(target, options);
}

export default aiArchExpect;
