import { describe, expect, it } from 'vitest';
import scale, { createScale, scaleSpec, applyScale } from './index.js';
import aiExpect from '../expect/index.js';

describe('scale examples', () => {
  it('should handle plain numeric input', async () => {
    const prompt = `
Create a scale that maps numbers from 1 to 1000000 onto a 0-10 range using logarithmic scaling.
The scale should work such that:
- Very small numbers (1-10) map to the lower part of the range (0-2)
- Medium numbers (100-10000) map to the middle of the range (3-7)  
- Large numbers (100000-1000000) map to the upper part of the range (8-10)

Use a logarithmic transformation to handle the wide input range.`;

    const logScale = scale(prompt);

    const result1 = await logScale(10);
    const result2 = await logScale(1000);
    const result3 = await logScale(100000);

    expect(typeof result1).toBe('number');
    expect(result1).toBeGreaterThanOrEqual(0);
    expect(result1).toBeLessThanOrEqual(3);

    expect(typeof result2).toBe('number');
    expect(result2).toBeGreaterThanOrEqual(3);
    expect(result2).toBeLessThanOrEqual(7);

    expect(typeof result3).toBe('number');
    expect(result3).toBeGreaterThanOrEqual(7);
    expect(result3).toBeLessThanOrEqual(10);
  }, 15000);

  it('should map star ratings to quality scores', async () => {
    const prompt = `
Sample data (NDJSON format):
{"stars": 1}
{"stars": 2}
{"stars": 3}
{"stars": 4}
{"stars": 5}

Range:
name: quality
description: Quality score where 0 means terrible and 100 means amazing
bounds: [0, 100]

Mapping: Map the "stars" field linearly to the quality range. 1 star = 0, 5 stars = 100.`;

    const qualityScale = scale(prompt);

    const result1 = await qualityScale({ stars: 1 });
    const result2 = await qualityScale({ stars: 3 });
    const result3 = await qualityScale({ stars: 5 });

    expect(result1).toBe(0);
    expect(result2).toBe(50);
    expect(result3).toBe(100);
  }, 15000);

  it('should evaluate multidimensional apartment desirability', async () => {
    const prompt = `
You are evaluating apartments on overall desirability score from 0-100.
Consider these 5 subjective factors:
1. Location convenience (walkability, transit, nearby amenities)
2. Space quality (layout efficiency, natural light, storage)
3. Building character (amenities, community, maintenance)
4. Neighborhood energy (quiet vs vibrant, culture, demographics)
5. Future trajectory (development plans, investment potential)

Sample apartment data:
{"name": "The Urban Loft", "location": 9, "space": 6, "building": 8, "neighborhood": 9, "future": 7}
{"name": "Garden Courtyard", "location": 6, "space": 9, "building": 7, "neighborhood": 6, "future": 8}
{"name": "Historic Brownstone", "location": 8, "space": 7, "building": 6, "neighborhood": 8, "future": 9}
{"name": "Modern High-Rise", "location": 7, "space": 8, "building": 9, "neighborhood": 7, "future": 6}
{"name": "Artist Colony", "location": 7, "space": 7, "building": 8, "neighborhood": 9, "future": 8}

Each factor is rated 1-10. Create a holistic desirability score that captures how these factors interact.
Weight location and space slightly higher, but consider that perfect scores in any two factors can compensate for weaknesses.`;

    const apartmentScale = scale(prompt);

    // Five genuinely difficult choices
    const urbanLoft = await apartmentScale({
      name: 'The Urban Loft',
      location: 9,
      space: 6,
      building: 8,
      neighborhood: 9,
      future: 7,
    });

    const gardenCourtyard = await apartmentScale({
      name: 'Garden Courtyard',
      location: 6,
      space: 9,
      building: 7,
      neighborhood: 6,
      future: 8,
    });

    const historicBrownstone = await apartmentScale({
      name: 'Historic Brownstone',
      location: 8,
      space: 7,
      building: 6,
      neighborhood: 8,
      future: 9,
    });

    const modernHighRise = await apartmentScale({
      name: 'Modern High-Rise',
      location: 7,
      space: 8,
      building: 9,
      neighborhood: 7,
      future: 6,
    });

    const artistColony = await apartmentScale({
      name: 'Artist Colony',
      location: 7,
      space: 7,
      building: 8,
      neighborhood: 9,
      future: 8,
    });

    // All should score relatively high but differently
    const urbanLoftCheck = await aiExpect(urbanLoft).toSatisfy(
      'a desirability score between 70 and 90'
    );
    expect(urbanLoftCheck).toBe(true);

    const gardenCheck = await aiExpect(gardenCourtyard).toSatisfy(
      'a desirability score between 65 and 85'
    );
    expect(gardenCheck).toBe(true);

    const brownstoneCheck = await aiExpect(historicBrownstone).toSatisfy(
      'a desirability score between 68 and 88'
    );
    expect(brownstoneCheck).toBe(true);

    const highRiseCheck = await aiExpect(modernHighRise).toSatisfy(
      'a desirability score between 67 and 87'
    );
    expect(highRiseCheck).toBe(true);

    const artistCheck = await aiExpect(artistColony).toSatisfy(
      'a desirability score between 69 and 89'
    );
    expect(artistCheck).toBe(true);
  }, 15000);

  it('should apply complex objection-adjusted approval voting scale', async () => {
    const prompt = `
Create an objection-adjusted approval effectiveness scale from 0-100 that accounts for:
1. Base approval rate (non-linear by group size)
2. The nature and severity of the top objection
3. How the objection interacts with group dynamics

Base approval dynamics:
- Small groups (2-10): Consensus critical, use (approval_rate)^3
- Medium groups (11-50): Balanced, use (approval_rate)^1.5  
- Large groups (51-200): Broad support matters, use sqrt(approval_rate)
- Massive groups (201+): Plateau effect, use min(1, approval_rate * 1.3)

Objection adjustment rules:
- Fundamental objections (ethics, safety, legality): Multiply by 0.3-0.6 based on group size (larger groups = more severe)
- Resource objections (cost, time, complexity): Multiply by 0.6-0.9 inversely with group size (smaller groups = more severe)
- Preference objections (aesthetics, style, approach): Multiply by 0.8-0.95 based on approval rate
- Process objections (timing, communication, inclusion): Multiply by 0.7-0.85, worse in medium groups

Sample data with objections:
{"proposal": "New office layout", "voters": 8, "approvals": 7, "topObjection": "Reduces personal space too much", "objectionType": "preference"}
{"proposal": "Mandatory overtime", "voters": 45, "approvals": 28, "topObjection": "Violates work-life balance agreements", "objectionType": "fundamental"}
{"proposal": "Tech upgrade", "voters": 150, "approvals": 95, "topObjection": "Budget exceeds allocation by 40%", "objectionType": "resource"}
{"proposal": "Remote work policy", "voters": 500, "approvals": 380, "topObjection": "Rushed without proper consultation", "objectionType": "process"}

Calculate: base_score * objection_multiplier = final effectiveness`;

    const approvalScale = scale(prompt);

    // Small group with preference objection
    const smallGroupPref = await approvalScale({
      proposal: 'Team retreat location',
      voters: 9,
      approvals: 7,
      topObjection: 'Too far from public transit',
      objectionType: 'preference',
    });

    // Medium group with fundamental objection
    const mediumGroupFund = await approvalScale({
      proposal: 'Client data sharing',
      voters: 35,
      approvals: 25,
      topObjection: 'Potential privacy law violations',
      objectionType: 'fundamental',
    });

    // Large group with resource objection
    const largeGroupRes = await approvalScale({
      proposal: 'New software platform',
      voters: 120,
      approvals: 85,
      topObjection: 'Requires 6 months of training time',
      objectionType: 'resource',
    });

    // Massive group with process objection
    const massiveGroupProc = await approvalScale({
      proposal: 'Organizational restructure',
      voters: 450,
      approvals: 300,
      topObjection: 'Leadership decided without employee input',
      objectionType: 'process',
    });

    // Complex case: High approval but severe objection
    const complexCase = await approvalScale({
      proposal: 'AI monitoring system',
      voters: 60,
      approvals: 48,
      topObjection: 'Invasive employee surveillance concerns',
      objectionType: 'fundamental',
    });

    // Verify they return appropriate effectiveness scores
    const smallGroupCheck = await aiExpect(smallGroupPref).toSatisfy(
      'a number between 0 and 100 representing effectiveness score for high consensus with mild preference objection'
    );
    expect(smallGroupCheck).toBe(true);

    const mediumGroupCheck = await aiExpect(mediumGroupFund).toSatisfy(
      'a number between 0 and 100 representing effectiveness score showing impact of fundamental objection on medium group'
    );
    expect(mediumGroupCheck).toBe(true);

    const largeGroupCheck = await aiExpect(largeGroupRes).toSatisfy(
      'a number between 0 and 100 representing effectiveness score for large group with resource concerns'
    );
    expect(largeGroupCheck).toBe(true);

    const massiveGroupCheck = await aiExpect(massiveGroupProc).toSatisfy(
      'a number between 0 and 100 representing effectiveness score for massive group with process objection'
    );
    expect(massiveGroupCheck).toBe(true);

    const complexCaseCheck = await aiExpect(complexCase).toSatisfy(
      'a number between 0 and 100 representing effectiveness score where fundamental objections impact high approval'
    );
    expect(complexCaseCheck).toBe(true);

    // Verify relative ordering makes sense
    // Fundamental objections should generally have lower scores
    expect(mediumGroupFund).toBeLessThanOrEqual(smallGroupPref);
    expect(complexCase).toBeLessThanOrEqual(largeGroupRes);
  }, 15000);
});

describe('createScale examples', () => {
  it('should generate and use a consistent specification', { timeout: 15000 }, async () => {
    // First generate the specification
    const tempSpec = await scaleSpec(`
      Convert temperature feelings to comfort descriptions:
      - Below 10°C: "freezing"
      - 10-15°C: "cold"
      - 15-20°C: "cool"
      - 20-25°C: "comfortable"
      - 25-30°C: "warm"
      - Above 30°C: "hot"
    `);

    // Then create the scale with the specification
    const tempScale = createScale(tempSpec);

    // Apply the scale to different temperatures
    const result1 = await tempScale(22);
    const result2 = await tempScale(8);
    const result3 = await tempScale(28);

    // Check results match expected descriptions
    const check1 = await aiExpect(result1).toSatisfy(
      'a comfort description for around 22°C, likely "comfortable"'
    );
    expect(check1).toBe(true);

    const check2 = await aiExpect(result2).toSatisfy(
      'a comfort description for 8°C, likely "freezing" or "cold"'
    );
    expect(check2).toBe(true);

    const check3 = await aiExpect(result3).toSatisfy(
      'a comfort description for 28°C, likely "warm"'
    );
    expect(check3).toBe(true);

    // Check that specification is accessible
    expect(tempScale.specification).toBeTruthy();
    expect(tempScale.specification).toBe(tempSpec);
  });

  it('should maintain consistency across multiple calls', { timeout: 15000 }, async () => {
    // Generate specification first
    const sentimentSpec = await scaleSpec('Rate text sentiment from -1 (negative) to 1 (positive)');
    const consistencyScale = createScale(sentimentSpec);

    // Multiple calls should produce consistent results for same input
    const text = 'This product is amazing!';
    const results = await Promise.all([
      consistencyScale(text),
      consistencyScale(text),
      consistencyScale(text),
    ]);

    // All results should be positive and similar
    results.forEach((result) => {
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThanOrEqual(1);
    });

    // Results should be identical (using same spec)
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });
});

describe('scaleSpec and applyScale examples', () => {
  it('should generate a specification and apply it separately', { timeout: 15000 }, async () => {
    // Generate specification once
    const spec = await scaleSpec(`
      Convert priority levels to numeric urgency scores:
      - "low": 1-3
      - "medium": 4-6
      - "high": 7-8
      - "critical": 9-10
    `);

    expect(spec).toBeTruthy();
    expect(spec).toHaveProperty('domain');
    expect(spec).toHaveProperty('range');
    expect(spec).toHaveProperty('mapping');

    const specCheck = await aiExpect(spec).toSatisfy(
      'a scale specification object with domain, range, and mapping properties that maps priority levels to numeric ranges'
    );
    expect(specCheck).toBe(true);

    // Apply the specification multiple times
    const low = await applyScale('low', spec);
    const medium = await applyScale('medium', spec);
    const high = await applyScale('high', spec);
    const critical = await applyScale('critical', spec);

    expect(typeof low).toBe('number');
    expect(typeof medium).toBe('number');
    expect(typeof high).toBe('number');
    expect(typeof critical).toBe('number');

    // Check ranges
    expect(low).toBeGreaterThanOrEqual(1);
    expect(low).toBeLessThanOrEqual(3);
    expect(medium).toBeGreaterThanOrEqual(4);
    expect(medium).toBeLessThanOrEqual(6);
    expect(high).toBeGreaterThanOrEqual(7);
    expect(high).toBeLessThanOrEqual(8);
    expect(critical).toBeGreaterThanOrEqual(9);
    expect(critical).toBeLessThanOrEqual(10);
  });

  it('should handle complex domain-specific scaling', { timeout: 15000 }, async () => {
    const spec = await scaleSpec(`
      Convert software complexity metrics to developer effort estimates (in hours):
      - Lines of code (LOC)
      - Cyclomatic complexity
      - Number of dependencies
      
      Rules:
      - Base hours = LOC / 50
      - Add 2 hours per complexity point above 5
      - Add 1 hour per external dependency
      - Minimum 1 hour, maximum 40 hours
    `);

    expect(spec).toBeTruthy();
    expect(spec).toHaveProperty('domain');
    expect(spec).toHaveProperty('range');
    expect(spec).toHaveProperty('mapping');

    const task1 = await applyScale(
      {
        loc: 200,
        complexity: 8,
        dependencies: 3,
      },
      spec
    );

    const task2 = await applyScale(
      {
        loc: 50,
        complexity: 2,
        dependencies: 1,
      },
      spec
    );

    expect(typeof task1).toBe('number');
    expect(typeof task2).toBe('number');
    expect(task1).toBeGreaterThan(task2);
    expect(task1).toBeLessThanOrEqual(40);
    expect(task2).toBeGreaterThanOrEqual(1);
  });
});
