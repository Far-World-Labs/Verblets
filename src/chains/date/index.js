import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import toDate from '../../lib/to-date/index.js';
import bool from '../../verblets/bool/index.js';
import retry from '../../lib/retry/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { dateExpectationsSchema, dateValueSchema } from './schemas.js';
import {
  createLifecycleLogger,
  extractLLMConfig,
  extractPromptAnalysis,
  extractResultValue,
} from '../../lib/lifecycle-logger/index.js';
import { initChain, withPolicy } from '../../lib/context/option.js';

const {
  asDate,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
} = promptConstants;

// ===== Option Mappers =====

const DEFAULT_RIGOR = { validate: true, maxAttempts: 3, returnBestEffort: true };

/**
 * Map rigor option to a date processing posture.
 * low: extraction only — no expectation generation, no validation loop. Cheapest (1 LLM call).
 * high: strict validation — more attempts, returns undefined on exhaustion instead of best-effort.
 * Default: extract + validate + retry, returning best-effort date on exhaustion.
 * @param {string|object|undefined} value
 * @returns {{ validate: boolean, maxAttempts: number, returnBestEffort: boolean }}
 */
export const mapRigor = (value) => {
  if (value === undefined) return DEFAULT_RIGOR;
  if (typeof value === 'object') return value;
  return (
    {
      low: { validate: false, maxAttempts: 1, returnBestEffort: true },
      med: DEFAULT_RIGOR,
      high: { validate: true, maxAttempts: 5, returnBestEffort: false },
    }[value] ?? DEFAULT_RIGOR
  );
};

// Date disambiguation guidelines to add to prompts
const disambiguationGuideline = `When interpreting dates:
- Default to UTC timezone
- For ambiguous formats (01-02-03), use context clues
- For partial dates (year only), use January 1st
- For quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec`;

// Prompt builders
const buildExpectationPrompt = (question) => `${contentIsQuestion} ${question}

List up to three short yes/no checks that would confirm a date answer is correct. If nothing specific comes to mind, include "The result is a valid date".`;

const buildDatePrompt = (text) => `${contentIsQuestion} ${text}

${disambiguationGuideline}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asDate} ${asUndefinedByDefault}

The value should be the date in ISO format or "undefined".`;

// Removed buildRetryPrompt - directly using buildDatePrompt inline

const buildValidationPrompt = (dateValue, check) => {
  const iso = dateValue.toISOString();
  const human = dateValue.toUTCString();
  return `Date in ISO: ${iso} (UTC: ${human}). Does this satisfy "${check}"?`;
};

// Helper to normalize date to UTC midnight
const toUTCDate = (date) => {
  if (!date) return undefined;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

// Extract date with retry support
async function extractDate(prompt, config) {
  const response = await callLlm(prompt, {
    ...config,
    response_format: jsonSchema('date_extraction', dateValueSchema),
  });

  if (response === 'undefined') return undefined;
  return toUTCDate(toDate(response));
}

// Validate date against expectations
async function validateDate(dateValue, expectations, config) {
  const { logger } = config;
  for (const check of expectations) {
    const validationPrompt = buildValidationPrompt(dateValue, check);
    logger?.logEvent('validation-prompt', extractPromptAnalysis(validationPrompt));

    const passed = await bool(validationPrompt, config);

    if (!passed) {
      return { passed: false, failedCheck: check };
    }
  }
  return { passed: true };
}

export default async function date(text, config = {}) {
  const {
    config: scopedConfig,
    maxAttempts,
    validate,
    returnBestEffort,
  } = await initChain('date', config, {
    rigor: withPolicy(mapRigor, ['validate', 'maxAttempts', 'returnBestEffort']),
  });
  config = scopedConfig;
  const { logger } = config;

  // Create lifecycle logger with date chain namespace
  const lifecycleLogger = createLifecycleLogger(logger, 'chain:date');

  // Log start with input
  lifecycleLogger.logStart({
    input: text,
    maxAttempts,
    ...extractLLMConfig(config.llm),
  });

  // Build all prompts upfront and log them
  const expectationPrompt = buildExpectationPrompt(text);
  const datePrompt = buildDatePrompt(text);

  lifecycleLogger.logEvent('prompts-built', {
    expectations: extractPromptAnalysis(expectationPrompt),
    extraction: extractPromptAnalysis(datePrompt),
  });

  // Low rigor: extraction only — skip expectations and validation
  if (!validate) {
    const firstDate = await extractDate(datePrompt, { ...config, logger: lifecycleLogger });

    lifecycleLogger.logResult(
      firstDate,
      extractResultValue(firstDate?.toISOString() || 'undefined', firstDate)
    );
    return firstDate;
  }

  // Parallelize expectations and first date extraction
  const [expectationsResult, firstDate] = await Promise.all([
    callLlm(expectationPrompt, {
      ...config,
      response_format: jsonSchema('date_expectations', dateExpectationsSchema),
      logger: lifecycleLogger,
    }),
    extractDate(datePrompt, { ...config, logger: lifecycleLogger }),
  ]);

  const expectations =
    expectationsResult.length > 0 ? expectationsResult : ['The result is a valid date'];

  lifecycleLogger.logEvent('parallel-complete', {
    expectations,
    firstDate: firstDate?.toISOString(),
  });

  // Handle undefined response
  if (!firstDate) {
    lifecycleLogger.logResult(undefined, extractResultValue('undefined', undefined));
    return undefined;
  }

  // State for retry loop
  let currentDate = firstDate;
  let currentText = text;

  // Use retry for the entire chain
  const result = await retry(
    async () => {
      lifecycleLogger.logEvent('attempt', {
        date: currentDate.toISOString(),
      });

      // Validate current date
      const validation = await validateDate(currentDate, expectations, {
        ...config,
        logger: lifecycleLogger,
      });

      if (validation.passed) {
        return currentDate;
      }

      // Validation failed, prepare for retry
      lifecycleLogger.logEvent('validation-failed', {
        failedCheck: validation.failedCheck,
        dateValue: currentDate.toISOString(),
      });

      // Build retry prompt and get new date
      currentText = `${text} The previous answer (${currentDate.toISOString()}) failed to satisfy: "${
        validation.failedCheck
      }". Try again.`;
      const retryPrompt = buildDatePrompt(currentText);
      lifecycleLogger.logEvent('retry-prompt', extractPromptAnalysis(retryPrompt));

      const newDate = await extractDate(retryPrompt, { ...config, logger: lifecycleLogger });

      if (!newDate) {
        // High rigor: return undefined on exhaustion instead of best-effort
        if (!returnBestEffort) return undefined;
        return currentDate;
      }

      currentDate = newDate;

      // Throw to trigger retry
      throw new Error(`Retrying after validation failure`);
    },
    {
      label: 'date-chain',
      config,
      maxAttempts,
      retryOnAll: true,
    }
  );

  lifecycleLogger.logResult(
    result,
    extractResultValue(result?.toISOString() || 'undefined', result)
  );
  return result;
}
