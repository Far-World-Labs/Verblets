# calibrate

Build specification-based classifiers from scan results. A two-pass process: first generate a calibration specification from corpus statistics, then apply it to classify individual items by severity and salience.

```javascript
import { calibrateSpec, applyCalibrate, scanVectors, embedBatch, embedChunked } from '@far-world-labs/verblets';

// Embed probes and chunk text yourself
const probeVectors = await embedBatch(probeDefs.map(p => p.query));
const probes = probeDefs.map((p, i) => ({ ...p, vector: probeVectors[i] }));
const chunks = await embedChunked(text, { maxTokens: 256 });

// Scan and threshold — caller decides what score matters
const hits = scanVectors(chunks, probes).filter(h => h.score >= 0.4);
const scan = { flagged: hits.length > 0, hits };

// Two-pass calibration — learn spec from corpus, apply to individual items
const spec = await calibrateSpec(scans, { instructions: 'Classify data sensitivity' });
const classification = await applyCalibrate(scan, spec);
// => { severity: 'high', salience: 'significant', categories: {...}, summary: '...' }
```

## API

### `calibrate(instructions?, config?)`

Returns a classifier function: `async (scan) => result`. Each call builds a fresh spec from the single scan — convenient for one-off classification.

### `calibrateSpec(scans, config?)`

Generate a calibration specification from an array of scan results. Computes corpus statistics (flag rates, score distributions, category breakdowns) and asks the LLM to produce classification criteria.

- **scans** (Array): Scan results, each with `{ flagged, hits }` (build with `scanVectors` + threshold)
- **config.instructions** (string): Domain-specific classification guidance
- **config.sensitivity** (`'low'` | `'high'`): `'low'` prefers false negatives (conservative); `'high'` prefers false positives (sensitive)
- **config.thresholdStrategy** (string): `'statistical'` (default), `'percentile'`, or `'fixed'`

**Returns:** `{ corpusProfile, classificationCriteria, salienceCriteria, categoryNotes }` — all strings.

### `applyCalibrate(scan, specification, config?)`

Classify a single scan result against an existing specification.

**Returns:** `{ severity, salience, categories, summary }`

### `createCalibratedClassifier(specification, config?)`

Bind a specification into a reusable classifier function. The returned function has a `.specification` property for inspection.
