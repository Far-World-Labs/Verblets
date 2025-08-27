/**
 * Show AI Input/Output Handler
 * Displays the actual inputs and outputs from AI chains/verblets during tests
 */

import { bold, cyan, gray, green, yellow, drawBox } from '../output-utils.js';

/**
 * Extract AI I/O events from the events array
 * Matches both direct AI events and lifecycle logger events
 */
const extractIoEvents = (events) => {
  if (!events || !Array.isArray(events)) return [];

  return events.filter((event) => {
    const eventType = event.event;
    if (!eventType) return false;

    // Direct AI events
    if (eventType === 'ai-input' || eventType === 'ai-output') return true;

    // Lifecycle logger events (e.g., bool:input, central-tendency:output)
    if (eventType.includes(':input') || eventType.includes(':output')) return true;

    return false;
  });
};

/**
 * Normalize event structure
 * Handles differences between event types
 */
const normalizeEvent = (event) => {
  const isInput = event.event.includes('input');
  const isOutput = event.event.includes('output');

  return {
    type: isInput ? 'input' : isOutput ? 'output' : 'unknown',
    value: event.value ?? event.full ?? event.data ?? event,
    testName: event.testName ?? event.test ?? 'Unknown',
    testIndex: event.testIndex,
    suite: event.suite,
    timestamp: event.timestamp ?? event.ts,
    namespace: event.event.split(':')[0], // e.g., 'bool' from 'bool:input'
  };
};

/**
 * Group normalized events by test
 * Uses testName as primary key since it's more reliable
 */
const groupByTest = (events) => {
  const grouped = new Map();

  events.forEach((event) => {
    const normalized = normalizeEvent(event);
    const key = normalized.testName;

    if (!grouped.has(key)) {
      grouped.set(key, {
        testName: key,
        inputs: [],
        outputs: [],
      });
    }

    const group = grouped.get(key);
    if (normalized.type === 'input') {
      group.inputs.push(normalized);
    } else if (normalized.type === 'output') {
      group.outputs.push(normalized);
    }
  });

  return grouped;
};

/**
 * Format a single test's I/O pairs
 */
const formatTestIo = (testGroup, showInput, showOutput) => {
  const { testName, inputs, outputs } = testGroup;
  const lines = [`      ${bold(testName)}`];

  // Pair inputs and outputs sequentially
  const maxLength = Math.max(inputs.length, outputs.length);

  for (let i = 0; i < maxLength; i++) {
    const input = inputs[i];
    const output = outputs[i];

    if (showInput && input) {
      lines.push('');
      const namespace = input.namespace ? `[${input.namespace}]` : '';
      lines.push(drawBox(input.value, `Input ${namespace}`, green));
    } else if (!showInput && showOutput && output) {
      // Show placeholder when input is disabled but output exists
      lines.push('');
      lines.push(`      ${gray('(input disabled)')}`);
    }

    if (showOutput && output) {
      lines.push('');
      const namespace = output.namespace ? `[${output.namespace}]` : '';
      lines.push(drawBox(output.value, `Output ${namespace}`, yellow));
    }
  }

  return lines.join('\n');
};

/**
 * Main display function
 */
const display = (events, showInput = false, showOutput = true) => {
  const title = showInput && showOutput ? 'AI INPUT/OUTPUT' : showInput ? 'AI INPUT' : 'AI OUTPUT';
  const header = bold(cyan(title));

  if (!events || events.length === 0) {
    return `${header}
      No events available for analysis.`;
  }

  const ioEvents = extractIoEvents(events);

  if (ioEvents.length === 0) {
    return `${header}
      No AI input/output captured during test execution.
      
      Ensure your verblets/chains pass a logger and use lifecycle logging:
      ${gray('const logger = makeTestLogger("test name");')}
      ${gray('const result = await myVerblet(input, { logger });')}`;
  }

  const grouped = groupByTest(ioEvents);

  if (grouped.size === 0) {
    return `${header}
      Events found but could not group by test.`;
  }

  const testOutputs = Array.from(grouped.values())
    .filter(
      (group) => (showInput && group.inputs.length > 0) || (showOutput && group.outputs.length > 0)
    )
    .map((group) => formatTestIo(group, showInput, showOutput));

  if (testOutputs.length === 0) {
    return `${header}
      No matching events to display.`;
  }

  return [header, '', ...testOutputs].join('\n');
};

/**
 * Handler entry point
 */
export function showAiInputOutput(context, args = {}) {
  const { showInput = false, showOutput = true } = args;
  return display(context.events || [], showInput, showOutput);
}
