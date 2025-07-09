import { describe, it, expect } from 'vitest';
import detectThreshold from './index.js';

describe('detect-threshold examples', () => {
  it('should analyze risk scores for fraud detection', { timeout: 60000 }, async () => {
    const transactions = [
      { id: 1, amount: 50, riskScore: 0.05, merchant: 'Grocery Store' },
      { id: 2, amount: 1500, riskScore: 0.72, merchant: 'Jewelry Store' },
      { id: 3, amount: 25, riskScore: 0.12, merchant: 'Coffee Shop' },
      { id: 4, amount: 300, riskScore: 0.38, merchant: 'Gas Station' },
      { id: 5, amount: 5000, riskScore: 0.91, merchant: 'Wire Transfer' },
      { id: 6, amount: 120, riskScore: 0.25, merchant: 'Restaurant' },
      { id: 7, amount: 2000, riskScore: 0.68, merchant: 'Electronics' },
      { id: 8, amount: 15, riskScore: 0.08, merchant: 'Fast Food' },
      { id: 9, amount: 800, riskScore: 0.55, merchant: 'Department Store' },
      { id: 10, amount: 3500, riskScore: 0.83, merchant: 'Online Marketplace' },
    ];

    const result = await detectThreshold({
      data: transactions,
      targetProperty: 'riskScore',
      goal: 'Set thresholds for a three-tier system: auto-approve low risk, manual review medium risk, auto-decline high risk. Minimize customer friction while preventing fraud.',
    });

    expect(result).toHaveProperty('thresholdCandidates');
    expect(result).toHaveProperty('distributionAnalysis');
    expect(result.thresholdCandidates).toBeInstanceOf(Array);
    expect(result.thresholdCandidates.length).toBeGreaterThan(0);

    result.thresholdCandidates.forEach((candidate) => {
      expect(candidate).toHaveProperty('value');
      expect(candidate).toHaveProperty('rationale');
      expect(candidate).toHaveProperty('riskProfile');
      expect(candidate.value).toBeGreaterThanOrEqual(0);
      expect(candidate.value).toBeLessThanOrEqual(1);
    });
  });

  it('should detect performance thresholds for API monitoring', { timeout: 60000 }, async () => {
    const apiMetrics = Array.from({ length: 1000 }, (_, i) => ({
      endpoint: ['GET /users', 'POST /orders', 'GET /products'][i % 3],
      responseTime: Math.random() < 0.8 ? 50 + Math.random() * 200 : 500 + Math.random() * 2000,
      timestamp: new Date(2024, 0, 1, 0, i * 5).toISOString(),
    }));

    const result = await detectThreshold({
      data: apiMetrics,
      targetProperty: 'responseTime',
      goal: 'Identify response time thresholds for SLA monitoring. Need to distinguish between normal latency, degraded performance, and critical slowdowns.',
      chunkSize: 100, // Increase chunk size for better performance with large datasets
    });

    expect(result.thresholdCandidates).toBeInstanceOf(Array);
    expect(result.distributionAnalysis).toHaveProperty('mean');
    expect(result.distributionAnalysis).toHaveProperty('standardDeviation');
  });
});
