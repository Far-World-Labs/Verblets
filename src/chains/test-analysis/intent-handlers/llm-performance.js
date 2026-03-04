/**
 * LLM Performance Metrics Handler
 */

import { cyan, bold } from '../output-utils.js';

export function showLLMPerformanceMetrics(context, _args) {
  const llmMetrics = context.testData?.llmMetrics;

  if (!llmMetrics || llmMetrics.totalCalls === 0) {
    return `${bold(cyan('LLM PERFORMANCE METRICS'))}
      No LLM calls detected`;
  }

  const { totalCalls, callsByType, timingStats, cacheStats } = llmMetrics;

  // Build type breakdown
  const typeBreakdown = Object.entries(callsByType || {})
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  // Build timing info
  const timingInfo = timingStats
    ? `
      Timing:       min: ${timingStats.min}ms, avg: ${timingStats.avg}ms, max: ${timingStats.max}ms
      Percentiles:  p50: ${timingStats.p50}ms, p95: ${timingStats.p95}ms, p99: ${timingStats.p99}ms`
    : '';

  // Build cache info
  const cacheInfo =
    cacheStats && (cacheStats.cached > 0 || cacheStats.uncached > 0)
      ? `
      Cache:        ${cacheStats.cached} cached, ${cacheStats.uncached} uncached`
      : '';

  return `${bold(cyan('LLM PERFORMANCE METRICS'))}
      Total Calls:  ${totalCalls}${
    typeBreakdown ? ` (${typeBreakdown})` : ''
  }${timingInfo}${cacheInfo}`;
}
