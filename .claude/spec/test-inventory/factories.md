# Factory families

Recurring fixture shapes that should become fishery factories. No factory code is written in this PR — this file *names* and *characterizes* the families, and links each to its consumers in `inventory.json`.

The `factory-like` count for the repo (inline `mk*`/`make*`/`build*` helpers in spec files) is **134** as of inventory start. Each family below would absorb a slice of those.

## LlmMockResponse

**Base**: mock response from `callLlm` — well-formed JSON object matching a chain's declared `responseFormat`.

**Variants**:
- `LlmMockResponse.wellFormed`
- `LlmMockResponse.isNull`
- `LlmMockResponse.empty`
- `LlmMockResponse.undersizedArray`
- `LlmMockResponse.oversizedArray`
- `LlmMockResponse.malformedShape`
- `LlmMockResponse.rejected`
- `LlmMockResponse.rejectedThenResolved`

**Consumers** (103 files):

<details><summary>103 files (click to expand)</summary>

- `spec.chains.analyze-image` — src/chains/analyze-image/index.spec.js
- `spec.chains.calibrate` — src/chains/calibrate/index.spec.js
- `spec.chains.conversation` — src/chains/conversation/index.spec.js
- `spec.chains.date` — src/chains/date/index.spec.js
- `spec.chains.detect-threshold` — src/chains/detect-threshold/index.spec.js
- `spec.chains.disambiguate` — src/chains/disambiguate/index.spec.js
- `spec.chains.dismantle` — src/chains/dismantle/index.spec.js
- `spec.chains.embed-object-define` — src/chains/embed-object-define/index.spec.js
- `spec.chains.embed-object-fragment` — src/chains/embed-object-fragment/index.spec.js
- `spec.chains.embed-object-refine` — src/chains/embed-object-refine/index.spec.js
- `spec.chains.entities` — src/chains/entities/index.spec.js
- `spec.chains.expect` — src/chains/expect/index.spec.js
- `spec.chains.extract-blocks` — src/chains/extract-blocks/index.spec.js
- `spec.chains.group` — src/chains/group/index.spec.js
- `spec.chains.intersections` — src/chains/intersections/index.spec.js
- `spec.chains.join` — src/chains/join/index.spec.js
- `spec.chains.list` — src/chains/list/index.spec.js
- `spec.chains.map` — src/chains/map/index.spec.js
- `spec.chains.option-history-analyzer` — src/chains/option-history-analyzer/index.spec.js
- `spec.chains.people` — src/chains/people/index.spec.js
- `spec.chains.pop-reference` — src/chains/pop-reference/index.spec.js
- `spec.chains.reduce` — src/chains/reduce/index.spec.js
- `spec.chains.relations` — src/chains/relations/index.spec.js
- `spec.chains.scale` — src/chains/scale/index.spec.js
- `spec.chains.score-matrix` — src/chains/score-matrix/index.spec.js
- `spec.chains.score` — src/chains/score/index.spec.js
- `spec.chains.set-interval` — src/chains/set-interval/index.spec.js
- `spec.chains.site-crawl` — src/chains/site-crawl/index.spec.js
- `spec.chains.socratic` — src/chains/socratic/index.spec.js
- `spec.chains.sort` — src/chains/sort/index.spec.js
- `spec.chains.split` — src/chains/split/index.spec.js
- `spec.chains.summary-map` — src/chains/summary-map/index.spec.js
- `spec.chains.tag-vocabulary` — src/chains/tag-vocabulary/index.spec.js
- `spec.chains.tags` — src/chains/tags/index.spec.js
- `spec.chains.test` — src/chains/test/index.spec.js
- `spec.chains.timeline` — src/chains/timeline/index.spec.js
- `spec.chains.to-object` — src/chains/to-object/index.spec.js
- `spec.chains.value-arbitrate` — src/chains/value-arbitrate/index.spec.js
- `spec.chains.veiled-variants` — src/chains/veiled-variants/index.spec.js
- `spec.init` — src/init.spec.js
- `spec.lib.llm` — src/lib/llm/index.spec.js
- `spec.lib.llm.telemetry-integration` — src/lib/llm/telemetry-integration.spec.js
- `spec.lib.llm.telemetry` — src/lib/llm/telemetry.spec.js
- `spec.lib.test-utils.config-integration` — src/lib/test-utils/config-integration.spec.js
- `spec.lib.test-utils.schema-contracts` — src/lib/test-utils/schema-contracts.spec.js
- `spec.verblets.auto` — src/verblets/auto/index.spec.js
- `spec.verblets.bool` — src/verblets/bool/index.spec.js
- `spec.verblets.central-tendency-lines` — src/verblets/central-tendency-lines/index.spec.js
- `spec.verblets.commonalities` — src/verblets/commonalities/index.spec.js
- `spec.verblets.embed-multi-query` — src/verblets/embed-multi-query/index.spec.js
- _…and 53 more_

</details>

**Notes**: Used in every chain spec that mocks `vi.mock('../../lib/llm/index.js')`. Stress tests reimplement variants inline; this is the highest-value family to extract first. Variants `empty` (returns `{}`/`""`), `malformedShape` (wrong field name or type), `rejected` (`mockRejectedValueOnce`), `rejectedThenResolved` (retry path).

## ProgressEvent

**Base**: `{ event: 'chain:complete', step, outcome: 'success'|'partial'|'degraded', totalItems, successCount, failedItems }`.

**Variants**:
- `ProgressEvent.success`
- `ProgressEvent.partial`
- `ProgressEvent.degraded`
- `ProgressEvent.error`
- `ProgressEvent.withInput`
- `ProgressEvent.withOutput`
- `ProgressEvent.phase`

**Consumers** (56 files):

<details><summary>56 files (click to expand)</summary>

- `spec.chains.calibrate` — src/chains/calibrate/index.spec.js
- `spec.chains.central-tendency` — src/chains/central-tendency/index.spec.js
- `spec.chains.entities` — src/chains/entities/index.spec.js
- `spec.chains.filter` — src/chains/filter/index.spec.js
- `spec.chains.map` — src/chains/map/index.spec.js
- `spec.chains.people` — src/chains/people/index.spec.js
- `spec.chains.pop-reference` — src/chains/pop-reference/index.spec.js
- `spec.chains.scale` — src/chains/scale/index.spec.js
- `spec.chains.score` — src/chains/score/index.spec.js
- `spec.chains.test` — src/chains/test/index.spec.js
- `spec.chains.timeline` — src/chains/timeline/index.spec.js
- `spec.lib.agent` — src/lib/agent/index.spec.js
- `spec.lib.context` — src/lib/context/index.spec.js
- `spec.lib.progress` — src/lib/progress/index.spec.js
- `spec.lib.test-utils.config-integration` — src/lib/test-utils/config-integration.spec.js
- `stress.analyze-image` — src/chains/analyze-image/index.spec.js
- `stress.calibrate` — src/chains/calibrate/index.spec.js
- `stress.central-tendency` — src/chains/central-tendency/index.spec.js
- `stress.collect-terms` — src/chains/collect-terms/index.spec.js
- `stress.conversation-turn-reduce` — src/chains/conversation-turn-reduce/index.spec.js
- `stress.conversation` — src/chains/conversation/index.spec.js
- `stress.date` — src/chains/date/index.spec.js
- `stress.detect-patterns` — src/chains/detect-patterns/index.spec.js
- `stress.detect-threshold` — src/chains/detect-threshold/index.spec.js
- `stress.disambiguate` — src/chains/disambiguate/index.spec.js
- `stress.embed-object-fragment` — src/chains/embed-object-fragment/index.spec.js
- `stress.embed-object-refine` — src/chains/embed-object-refine/index.spec.js
- `stress.entities` — src/chains/entities/index.spec.js
- `stress.filter-ambiguous` — src/chains/filter-ambiguous/index.spec.js
- `stress.filter` — src/chains/filter/index.spec.js
- `stress.find` — src/chains/find/index.spec.js
- `stress.glossary` — src/chains/glossary/index.spec.js
- `stress.group` — src/chains/group/index.spec.js
- `stress.intersections` — src/chains/intersections/index.spec.js
- `stress.join` — src/chains/join/index.spec.js
- `stress.list` — src/chains/list/index.spec.js
- `stress.map` — src/chains/map/index.spec.js
- `stress.option-history-analyzer` — src/chains/option-history-analyzer/index.spec.js
- `stress.people` — src/chains/people/index.spec.js
- `stress.pop-reference` — src/chains/pop-reference/index.spec.js
- `stress.questions` — src/chains/questions/index.spec.js
- `stress.reduce` — src/chains/reduce/index.spec.js
- `stress.relations` — src/chains/relations/index.spec.js
- `stress.scale` — src/chains/scale/index.spec.js
- `stress.score` — src/chains/score/index.spec.js
- `stress.socratic` — src/chains/socratic/index.spec.js
- `stress.sort` — src/chains/sort/index.spec.js
- `stress.split` — src/chains/split/index.spec.js
- `stress.tag-vocabulary` — src/chains/tag-vocabulary/index.spec.js
- `stress.tags` — src/chains/tags/index.spec.js
- _…and 6 more_

</details>

**Notes**: Every partial-outcome assertion across chains looks for these. A `eventsFor(chain)` factory + `assertOutcome(events, step, expected)` helper would replace dozens of inline scans. Variants: `error` adds an `error` field; `withInput`/`withOutput`/`phase` use the matching `event` string.

## ChainConfig

**Base**: `{ batchSize, maxParallel, maxAttempts, errorPosture }` — the standard list-orchestrator config.

**Variants**:
- `ChainConfig.strictPosture`
- `ChainConfig.resilientPosture`
- `ChainConfig.sequential`
- `ChainConfig.wide`
- `ChainConfig.smallBatches`
- `ChainConfig.largeBatches`
- `ChainConfig.noRetry`

**Consumers** (47 files):

<details><summary>47 files (click to expand)</summary>

- `spec.chains.calibrate` — src/chains/calibrate/index.spec.js
- `spec.chains.central-tendency` — src/chains/central-tendency/index.spec.js
- `spec.chains.embed-object-fragment` — src/chains/embed-object-fragment/index.spec.js
- `spec.chains.entities` — src/chains/entities/index.spec.js
- `spec.chains.extract-blocks` — src/chains/extract-blocks/index.spec.js
- `spec.chains.filter` — src/chains/filter/index.spec.js
- `spec.chains.find` — src/chains/find/index.spec.js
- `spec.chains.group` — src/chains/group/index.spec.js
- `spec.chains.intersections` — src/chains/intersections/index.spec.js
- `spec.chains.map` — src/chains/map/index.spec.js
- `spec.chains.people` — src/chains/people/index.spec.js
- `spec.chains.pop-reference` — src/chains/pop-reference/index.spec.js
- `spec.chains.reduce` — src/chains/reduce/index.spec.js
- `spec.chains.relations` — src/chains/relations/index.spec.js
- `spec.chains.scale` — src/chains/scale/index.spec.js
- `spec.chains.score-matrix` — src/chains/score-matrix/index.spec.js
- `spec.chains.score` — src/chains/score/index.spec.js
- `spec.chains.sort` — src/chains/sort/index.spec.js
- `spec.chains.themes` — src/chains/themes/index.spec.js
- `spec.chains.timeline` — src/chains/timeline/index.spec.js
- `spec.lib.collection.parallel` — src/lib/collection/parallel.spec.js
- `spec.lib.instruction` — src/lib/instruction/index.spec.js
- `spec.lib.parallel-batch` — src/lib/parallel-batch/index.spec.js
- `spec.lib.progress` — src/lib/progress/index.spec.js
- `spec.lib.test-utils.config-integration` — src/lib/test-utils/config-integration.spec.js
- `spec.lib.text-batch` — src/lib/text-batch/index.spec.js
- `spec.lib.with-config` — src/lib/with-config/index.spec.js
- `spec.services.embedding-model.loaders` — src/services/embedding-model/loaders.spec.js
- `examples.chains.analyze-image.wikipedia-companies` — src/chains/analyze-image/wikipedia-companies.examples.js
- `examples.chains.extract-blocks` — src/chains/extract-blocks/index.examples.js
- `examples.chains.filter` — src/chains/filter/index.examples.js
- `examples.chains.find` — src/chains/find/index.examples.js
- `examples.chains.group` — src/chains/group/index.examples.js
- `examples.chains.intersections` — src/chains/intersections/index.examples.js
- `examples.chains.map` — src/chains/map/index.examples.js
- `examples.chains.map.structured-extraction` — src/chains/map/structured-extraction.examples.js
- `examples.chains.sort` — src/chains/sort/index.examples.js
- `examples.chains.timeline` — src/chains/timeline/index.examples.js
- `stress.central-tendency` — src/chains/central-tendency/index.spec.js
- `stress.embed-object-fragment` — src/chains/embed-object-fragment/index.spec.js
- `stress.filter` — src/chains/filter/index.spec.js
- `stress.find` — src/chains/find/index.spec.js
- `stress.group` — src/chains/group/index.spec.js
- `stress.intersections` — src/chains/intersections/index.spec.js
- `stress.map` — src/chains/map/index.spec.js
- `stress.reduce` — src/chains/reduce/index.spec.js
- `stress.sort` — src/chains/sort/index.spec.js

</details>

**Notes**: Cross product with `LlmMockResponse` powers the parametric stress test patterns. `sequential` = `maxParallel: 1`; `wide` = `maxParallel: 8`; `smallBatches` = `batchSize: 1-2`; `largeBatches` = `batchSize: 50+`; `noRetry` = `maxAttempts: 1`.

## InstructionBundle

**Base**: `{ text, ...known }` — instruction-as-context bundles consumed by `resolveTexts`.

**Variants**:
- `InstructionBundle.plainText`
- `InstructionBundle.withSpec`
- `InstructionBundle.withVocabulary`
- `InstructionBundle.withCategories`
- `InstructionBundle.withAnchors`
- `InstructionBundle.withGuidance`
- `InstructionBundle.withCtx`

**Consumers** (25 files):

<details><summary>25 files (click to expand)</summary>

- `spec.chains.calibrate` — src/chains/calibrate/index.spec.js
- `spec.chains.embed-object-define` — src/chains/embed-object-define/index.spec.js
- `spec.chains.entities` — src/chains/entities/index.spec.js
- `spec.chains.group` — src/chains/group/index.spec.js
- `spec.chains.relations` — src/chains/relations/index.spec.js
- `spec.chains.scale` — src/chains/scale/index.spec.js
- `spec.chains.score-matrix` — src/chains/score-matrix/index.spec.js
- `spec.chains.score` — src/chains/score/index.spec.js
- `spec.chains.tags` — src/chains/tags/index.spec.js
- `spec.lib.collect-events-with` — src/lib/collect-events-with/index.spec.js
- `spec.lib.context.builder` — src/lib/context/builder.spec.js
- `spec.lib.context` — src/lib/context/index.spec.js
- `spec.lib.instruction` — src/lib/instruction/index.spec.js
- `spec.prompts.style` — src/prompts/style.spec.js
- `examples.chains.tags` — src/chains/tags/index.examples.js
- `stress.calibrate` — src/chains/calibrate/index.spec.js
- `stress.date` — src/chains/date/index.spec.js
- `stress.dismantle` — src/chains/dismantle/index.spec.js
- `stress.embed-object-refine` — src/chains/embed-object-refine/index.spec.js
- `stress.entities` — src/chains/entities/index.spec.js
- `stress.group` — src/chains/group/index.spec.js
- `stress.relations` — src/chains/relations/index.spec.js
- `stress.scale` — src/chains/scale/index.spec.js
- `stress.score` — src/chains/score/index.spec.js
- `stress.tags` — src/chains/tags/index.spec.js

</details>

**Notes**: Each chain has a known-keys list (`tagInstructions`, `scoreInstructions`, etc.). Factory variants line up with those keys.

## Scan

**Base**: one entry of `{ flagged: boolean, hits: [{ category, score }] }` consumed by `calibrate*`/`detect-patterns`.

**Variants**:
- `Scan.unflagged`
- `Scan.single-category`
- `Scan.multi-category`
- `Scan.NaN score`
- `Scan.missing hits`
- `Scan.empty hits`

**Consumers** (4 files):

<details><summary>4 files (click to expand)</summary>

- `spec.chains.calibrate` — src/chains/calibrate/index.spec.js
- `spec.lib.context.builder` — src/lib/context/builder.spec.js
- `examples.chains.calibrate` — src/chains/calibrate/index.examples.js
- `stress.calibrate` — src/chains/calibrate/index.spec.js

</details>

**Notes**: Drives calibrate, detect-patterns, detect-threshold rows. The shape comes from `probeScan` output.

## Notes on existing test-utils

These are *not* factories — they are real subjects registered in shared contract files. Cross-referenced from inventory rows via `contractCandidate`.

- `src/lib/test-utils/mapper-contracts.spec.js` — registers 29 mappers across object/numeric/string/enum contracts.
- `src/lib/test-utils/schema-contracts.spec.js` — registers value/items/factory schema subjects.
- `src/lib/test-utils/config-forwarding.js` — `testPromptShapingOption()` helper used by 7 verblets.

## Open decisions

- Whether to adopt fishery or roll a smaller helper. Fishery's `extend()` / `transient` / `sequence` features map well to the variant trees above.
- Whether factory output is asserted via type checks (jsdoc + IDE) or runtime guards (`expect-shape`).
- Where factory files live — proposed: `src/lib/test-utils/factories/<family>.js`.
