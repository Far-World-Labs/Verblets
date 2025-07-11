import { describe, expect, it } from 'vitest';
import scale from './index.js';
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

    const smallGroupCheck = await aiExpect(smallGroupPref).toSatisfy(
      'an effectiveness score between 40 and 70, reflecting high consensus with mild preference objection'
    );
    expect(smallGroupCheck).toBe(true);

    const mediumGroupCheck = await aiExpect(mediumGroupFund).toSatisfy(
      'an effectiveness score between 15 and 40, showing severe impact of fundamental objection'
    );
    expect(mediumGroupCheck).toBe(true);

    const largeGroupCheck = await aiExpect(largeGroupRes).toSatisfy(
      'an effectiveness score between 50 and 75, indicating good support with manageable resource concerns'
    );
    expect(largeGroupCheck).toBe(true);

    const massiveGroupCheck = await aiExpect(massiveGroupProc).toSatisfy(
      'an effectiveness score between 55 and 80, showing plateau effect with process issues'
    );
    expect(massiveGroupCheck).toBe(true);

    const complexCaseCheck = await aiExpect(complexCase).toSatisfy(
      'an effectiveness score between 20 and 45, demonstrating how fundamental objections override high approval'
    );
    expect(complexCaseCheck).toBe(true);
  }, 15000);
});
