# calibrate

Build specification-based classifiers from scan results. A two-pass process: first generate a calibration specification from corpus statistics, then apply it to classify individual items by severity and salience.

```javascript
import { calibrate, calibrateSpec, applyCalibrate, probeScan } from '@far-world-labs/verblets';

// Quick path — stateless classifier (builds spec per call)
const classify = calibrate('Classify sensitivity risk in medical records');
const result = await classify(scanResult);
// => { severity: 'high', salience: 'significant', categories: {...}, summary: '...' }

// Two-pass path — reuse a spec across many items
const scans = await probeScan(items, probes, config);
const spec = await calibrateSpec(scans, { instructions: 'Classify data sensitivity' });

for (const scan of scans) {
  const classification = await applyCalibrate(scan, spec);
  console.log(classification.severity, classification.salience);
}
```

## API

### `calibrate(instructions?, config?)`

Returns a classifier function: `async (scan) => result`. Each call builds a fresh spec from the single scan — convenient for one-off classification.

### `calibrateSpec(scans, config?)`

Generate a calibration specification from an array of `probeScan` results. Computes corpus statistics (flag rates, score distributions, category breakdowns) and asks the LLM to produce classification criteria.

- **scans** (Array): Scan results from `probeScan`, each with `{ flagged, hits }`
- **config.instructions** (string): Domain-specific classification guidance
- **config.sensitivity** (`'low'` | `'high'`): `'low'` prefers false negatives (conservative); `'high'` prefers false positives (sensitive)
- **config.thresholdStrategy** (string): `'statistical'` (default), `'percentile'`, or `'fixed'`

**Returns:** `{ corpusProfile, classificationCriteria, salienceCriteria, categoryNotes }` — all strings.

### `applyCalibrate(scan, specification, config?)`

Classify a single scan result against an existing specification.

**Returns:** `{ severity, salience, categories, summary }`

### `createCalibratedClassifier(specification, config?)`

Bind a specification into a reusable classifier function. The returned function has a `.specification` property for inspection.
