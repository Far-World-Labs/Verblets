import chatGPT from '../../lib/chatgpt/index.js';
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

const {
  asDate,
  asUndefinedByDefault,
  contentIsQuestion,
  explainAndSeparate,
  explainAndSeparatePrimitive,
  asJSON,
  asWrappedArrayJSON,
  asWrappedValueJSON,
} = promptConstants;

// Date disambiguation guidelines to add to prompts
const disambiguationGuideline = `When interpreting dates:
- Default to UTC timezone
- For ambiguous formats (01-02-03), use context clues
- For partial dates (year only), use January 1st
- For quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec`;

// Prompt builders
const buildExpectationPrompt = (question) => `${contentIsQuestion} ${question}

List up to three short yes/no checks that would confirm a date answer is correct. If nothing specific comes to mind, include "The result is a valid date".

${asWrappedArrayJSON}

${asJSON}`;

const buildDatePrompt = (text) => `${contentIsQuestion} ${text}

${disambiguationGuideline}

${explainAndSeparate} ${explainAndSeparatePrimitive}

${asDate} ${asUndefinedByDefault}

${asWrappedValueJSON} The value should be the date in ISO format or "undefined".

${asJSON}`;

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
async function extractDate(prompt, llm, logger, options) {
  const response = await chatGPT(prompt, {
    modelOptions: {
      ...llm,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'date_extraction',
          schema: dateValueSchema,
        },
      },
    },
    logger,
    ...options,
  });

  if (response === 'undefined') return undefined;
  return toUTCDate(toDate(response));
}

// Validate date against expectations
async function validateDate(dateValue, expectations, llm, logger, options) {
  for (const check of expectations) {
    const validationPrompt = buildValidationPrompt(dateValue, check);
    logger?.logEvent('validation-prompt', extractPromptAnalysis(validationPrompt));

    const passed = await bool(validationPrompt, { llm, logger, ...options });

    if (!passed) {
      return { passed: false, failedCheck: check };
    }
  }
  return { passed: true };
}

export default async function date(text, config = {}) {
  const { maxAttempts = 3, llm, logger, ...options } = config;

  // Create lifecycle logger with date chain namespace
  const lifecycleLogger = createLifecycleLogger(logger, 'chain:date');

  // Log start with input
  lifecycleLogger.logStart({
    input: text,
    maxAttempts,
    ...extractLLMConfig(llm),
  });

  // Build all prompts upfront and log them
  const expectationPrompt = buildExpectationPrompt(text);
  const datePrompt = buildDatePrompt(text);

  lifecycleLogger.logEvent('prompts-built', {
    expectations: extractPromptAnalysis(expectationPrompt),
    extraction: extractPromptAnalysis(datePrompt),
  });

  // Parallelize expectations and first date extraction
  const [expectationsResult, firstDate] = await Promise.all([
    chatGPT(expectationPrompt, {
      modelOptions: {
        ...llm,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'date_expectations',
            schema: dateExpectationsSchema,
          },
        },
      },
      logger: lifecycleLogger,
      ...options,
    }),
    extractDate(datePrompt, llm, lifecycleLogger, options),
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
      const validation = await validateDate(
        currentDate,
        expectations,
        llm,
        lifecycleLogger,
        options
      );

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

      const newDate = await extractDate(retryPrompt, llm, lifecycleLogger, options);

      if (!newDate) {
        // If we can't get a new date, return what we have
        return currentDate;
      }

      currentDate = newDate;

      // Throw to trigger retry
      throw new Error(`Retrying after validation failure`);
    },
    {
      maxRetries: maxAttempts - 1,
      retryOnAll: true,
    }
  );

  lifecycleLogger.logResult(
    result,
    extractResultValue(result?.toISOString() || 'undefined', result)
  );
  return result;
}
