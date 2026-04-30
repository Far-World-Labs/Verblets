import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import toDate from '../../lib/to-date/index.js';
import bool from '../../verblets/bool/index.js';
import retry from '../../lib/retry/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import { dateExpectationsSchema, dateValueSchema } from './schemas.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';
import { parallel } from '../../lib/index.js';

const name = 'date';

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
const buildExpectationPrompt = (
  question
) => `${contentIsQuestion} ${asXML(question, { tag: 'question' })}

List up to three short yes/no checks that would confirm a date answer is correct. If nothing specific comes to mind, include "The result is a valid date".`;

const buildDatePrompt = (text) => `${contentIsQuestion} ${asXML(text, { tag: 'text' })}

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
    responseFormat: jsonSchema('date_extraction', dateValueSchema),
  });

  if (response === 'undefined') return undefined;
  return toUTCDate(toDate(response));
}

// Validate date against expectations
async function validateDate(dateValue, expectations, config) {
  for (const check of expectations) {
    const validationPrompt = buildValidationPrompt(dateValue, check);
    const passed = await bool(validationPrompt, config);

    if (!passed) {
      return { passed: false, failedCheck: check };
    }
  }
  return { passed: true };
}

async function date(text, config = {}) {
  const { text: dateText, context } = resolveTexts(text, []);
  const effectiveText = context ? `${dateText}\n\n${context}` : dateText;
  const runConfig = nameStep(name, config);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: effectiveText });
  const { maxAttempts, validate, returnBestEffort } = await getOptions(runConfig, {
    rigor: withPolicy(mapRigor, ['validate', 'maxAttempts', 'returnBestEffort']),
  });
  try {
    // Build all prompts upfront
    const expectationPrompt = buildExpectationPrompt(effectiveText);
    const datePrompt = buildDatePrompt(effectiveText);

    // Low rigor: extraction only — skip expectations and validation
    if (!validate) {
      const firstDate = await extractDate(datePrompt, runConfig);
      emitter.emit({ event: DomainEvent.output, value: firstDate });
      emitter.complete({ outcome: Outcome.success });
      return firstDate;
    }

    // Parallelize expectations and first date extraction
    const [expectationsResult, firstDate] = await parallel(
      [
        () =>
          callLlm(expectationPrompt, {
            ...runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'expectations'),
            responseFormat: jsonSchema('date_expectations', dateExpectationsSchema),
          }),
        () =>
          extractDate(datePrompt, {
            ...runConfig,
            onProgress: scopePhase(runConfig.onProgress, 'extract'),
          }),
      ],
      (fn) => fn(),
      { maxParallel: 2, abortSignal: runConfig?.abortSignal }
    );

    const expectations =
      expectationsResult.length > 0 ? expectationsResult : ['The result is a valid date'];

    // Handle undefined response
    if (!firstDate) {
      emitter.emit({ event: DomainEvent.output, value: undefined });
      emitter.complete({ outcome: Outcome.success });
      return undefined;
    }

    // State for retry loop
    let currentDate = firstDate;
    let currentText = text;
    let attempt = 0;
    let validationPassed = false;
    const batchDone = emitter.batch(maxAttempts);

    // Use retry for the entire chain
    const result = await retry(
      async () => {
        attempt += 1;
        emitter.emit({
          event: DomainEvent.step,
          stepName: 'validation-attempt',
          attempt,
          maxAttempts,
          currentDate: currentDate?.toISOString(),
        });

        // Validate current date
        const validation = await validateDate(currentDate, expectations, runConfig);
        batchDone(1);

        if (validation.passed) {
          validationPassed = true;
          return currentDate;
        }

        // Build retry prompt and get new date
        currentText = `${effectiveText} The previous answer (${currentDate.toISOString()}) failed to satisfy: "${
          validation.failedCheck
        }". Try again.`;
        const retryPrompt = buildDatePrompt(currentText);

        const newDate = await extractDate(retryPrompt, runConfig);

        if (!newDate) {
          // High rigor: return undefined on exhaustion instead of best-effort
          if (!returnBestEffort) return undefined;
          return currentDate;
        }

        currentDate = newDate;

        if (attempt >= maxAttempts) {
          return returnBestEffort ? currentDate : undefined;
        }

        throw new Error(`Retrying after validation failure`);
      },
      {
        label: 'date-chain',
        config: runConfig,
        maxAttempts,
        retryOnAll: true,
      }
    );

    // Outcome distinguishes clean-validation vs exhausted-with-best-effort.
    // When validationPassed is false, the loop exited because attempts ran
    // out — caller intent (a date that satisfies the checks) was unmet.
    // Don't lie about that with Outcome.success.
    emitter.emit({ event: DomainEvent.output, value: result });
    emitter.complete({
      outcome: validationPassed ? Outcome.success : Outcome.degraded,
      attempts: attempt,
    });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}

date.knownTexts = [];

export default date;
