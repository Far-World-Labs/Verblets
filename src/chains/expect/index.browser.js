// Browser version of expect chain - no file introspection
import { env } from '../../lib/env/index.js';
import { expectCore, generateAdvice, handleAssertionResult } from './shared.js';
import { getOptions, scopeOperation } from '../../lib/context/option.js';

/**
 * Browser-compatible expect function
 * Code introspection features are not available
 */
export async function expect(actual, expected, constraint, config = {}) {
  config = scopeOperation('expect', config);
  const { mode } = await getOptions(config, {
    mode: env.LLM_EXPECT_MODE || 'none',
  });

  // Validate inputs
  if (expected === undefined && !constraint) {
    throw new Error('Either expected value or constraint must be provided');
  }

  // Run core expect without file context
  const passes = await expectCore(actual, expected, constraint, {}, config);

  // Generate advice if needed
  let advice = null;
  if (!passes && (mode === 'warn' || mode === 'info' || mode === 'error')) {
    advice = await generateAdvice(actual, expected, constraint, null, null, config);
  }

  // Browser caller info stub
  const callerInfo = {
    file: 'browser',
    line: 0,
    displayPath: 'browser',
  };

  // Handle result based on mode - this may throw an error in 'error' mode
  const result = handleAssertionResult(
    passes,
    mode,
    actual,
    expected,
    constraint,
    advice,
    callerInfo
  );

  // For backward compatibility with existing tests
  return [result, { passed: result, advice, file: callerInfo.file, line: callerInfo.line }];
}

/**
 * Simple LLM expectation (backward compatibility)
 */
export async function expectSimple(actual, expected, constraint, config = {}) {
  const [passed] = await expect(actual, expected, constraint, config);
  return passed;
}

export default expect;
