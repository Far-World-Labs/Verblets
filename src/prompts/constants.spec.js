import { describe, it, expect } from 'vitest';
import * as constants from './constants.js';

describe('constants', () => {
  it('exports all output format constants as strings', () => {
    expect(typeof constants.asUndefinedByDefault).toBe('string');
    expect(typeof constants.asBool).toBe('string');
    expect(typeof constants.asNumber).toBe('string');
    expect(typeof constants.asDate).toBe('string');
    expect(typeof constants.asJSON).toBe('string');
    expect(typeof constants.asWrappedArrayJSON).toBe('string');
    expect(typeof constants.asWrappedValueJSON).toBe('string');
    expect(typeof constants.asNumberWithUnits).toBe('string');
    expect(typeof constants.onlyJSON).toBe('string');
    expect(typeof constants.onlyJSONArray).toBe('string');
    expect(typeof constants.onlyJSONStringArray).toBe('string');
    expect(typeof constants.onlyJSONObjectArray).toBe('string');
    expect(typeof constants.shapeAsJSON).toBe('string');
  });

  it('exports all response steering constants as strings', () => {
    expect(typeof constants.strictFormat).toBe('string');
    expect(typeof constants.tryCompleteData).toBe('string');
    expect(typeof constants.useLineNumber).toBe('string');
    expect(typeof constants.noFabrication).toBe('string');
  });

  it('exports all content header constants as strings', () => {
    expect(typeof constants.contentIsQuestion).toBe('string');
    expect(typeof constants.contentIsInstructions).toBe('string');
    expect(typeof constants.contentIsDetails).toBe('string');
    expect(typeof constants.contentIsFixes).toBe('string');
    expect(typeof constants.contentIsMain).toBe('string');
    expect(typeof constants.contentToJSON).toBe('string');
    expect(typeof constants.contentIsExample).toBe('string');
    expect(typeof constants.contentIsChoices).toBe('string');
    expect(typeof constants.contentListCriteria).toBe('string');
    expect(typeof constants.contentListItemCriteria).toBe('string');
    expect(typeof constants.contentListToOmit).toBe('string');
    expect(typeof constants.contentIsExampleObject).toBe('string');
    expect(typeof constants.contentIsSchema).toBe('string');
    expect(typeof constants.contentHasIntent).toBe('string');
    expect(typeof constants.contentIsSortCriteria).toBe('string');
    expect(typeof constants.contentIsIntent).toBe('string');
    expect(typeof constants.contentIsOperationOption).toBe('string');
    expect(typeof constants.contentIsParametersOptions).toBe('string');
  });

  it('onlyJSON references JSON.parse', () => {
    expect(constants.onlyJSON).toContain('JSON.parse');
  });

  it('onlyJSONStringArray restricts to text-only arrays', () => {
    expect(constants.onlyJSONStringArray).toContain('only contain text');
  });

  it('asBool restricts to true/false', () => {
    expect(constants.asBool).toContain('true');
    expect(constants.asBool).toContain('false');
  });

  it('asNumber excludes formatting and units', () => {
    expect(constants.asNumber).toContain('Number constructor');
    expect(constants.asNumber).toContain('Do not include formatting');
  });

  it('asDate references ISO format', () => {
    expect(constants.asDate).toContain('ISO');
    expect(constants.asDate).toContain('Date constructor');
  });

  it('exports reasoning and process constants', () => {
    expect(typeof constants.thinkStepByStep).toBe('string');
    expect(typeof constants.summarizeRequest).toBe('string');
    expect(typeof constants.identifyAssumptions).toBe('string');
    expect(typeof constants.explainReasoning).toBe('string');
  });

  it('exports self-critique constants', () => {
    expect(typeof constants.argueAgainstOutput).toBe('string');
    expect(typeof constants.rateConfidence).toBe('string');
    expect(typeof constants.rateSatisfaction).toBe('string');
    expect(typeof constants.rewriteIfWeak).toBe('string');
  });

  it('exports depth and breadth constants', () => {
    expect(typeof constants.considerProsCons).toBe('string');
    expect(typeof constants.alternativeSolutions).toBe('string');
    expect(typeof constants.provideExamples).toBe('string');
    expect(typeof constants.expertResponse).toBe('string');
  });

  it('exports epistemic honesty constants', () => {
    expect(typeof constants.evidenceSupportsView).toBe('string');
    expect(typeof constants.limitationsOfApproach).toBe('string');
    expect(typeof constants.missingInformation).toBe('string');
  });

  it('rateConfidence uses 0-1 scale', () => {
    expect(constants.rateConfidence).toContain('0–1');
  });

  it('explainAndSeparate describes the explanation + divider pattern', () => {
    expect(constants.explainAndSeparate).toContain('explanation');
    expect(constants.explainAndSeparate).toContain('equal signs');
  });
});
