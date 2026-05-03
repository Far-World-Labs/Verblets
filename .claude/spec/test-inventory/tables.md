# Proposed table groups

Derived from `inventory.json` by `derive.mjs`. Hand-edit to refine groupings; re-running the script will overwrite.

Each group lists the rows that share an `inputs`/`want` shape and could share one processor. Singletons (one row only) are listed at the bottom for completeness.

## Multi-row groups (66)

### chains.analyze-image

- **Rows**: 2
- **Files**: `src/chains/analyze-image/index.spec.js`, `src/chains/analyze-image/index.examples.js`
- **Processor**: `(inputs) => analyzeImage(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 23

### chains.calibrate

- **Rows**: 2
- **Files**: `src/chains/calibrate/index.spec.js`, `src/chains/calibrate/index.examples.js`
- **Processor (varies)**: `(...args) => calibrateItem(...args)` / `(inputs) => calibrate(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent, Scan, InstructionBundle
- **Total claims**: 16

### chains.category-samples

- **Rows**: 2
- **Files**: `src/chains/category-samples/index.spec.js`, `src/chains/category-samples/index.examples.js`
- **Processor (varies)**: `(...args) => categorySamples(...args)` / `(inputs) => categorySamples(inputs)`
- **Total claims**: 11

### chains.central-tendency

- **Rows**: 2
- **Files**: `src/chains/central-tendency/index.spec.js`, `src/chains/central-tendency/index.examples.js`
- **Processor (varies)**: `(...args) => centralTendency(...args)` / `(inputs) => centralTendency(inputs)`
- **Factories**: ChainConfig, ProgressEvent
- **Total claims**: 11

### chains.collect-terms

- **Rows**: 2
- **Files**: `src/chains/collect-terms/index.spec.js`, `src/chains/collect-terms/index.examples.js`
- **Processor**: `(inputs) => collectTerms(inputs)`
- **Total claims**: 2

### chains.conversation

- **Rows**: 2
- **Files**: `src/chains/conversation/index.spec.js`, `src/chains/conversation/index.examples.js`
- **Processor (varies)**: `(inputs) => Conversation(inputs)` / `(inputs) => ConversationChain(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 16

### chains.date

- **Rows**: 2
- **Files**: `src/chains/date/index.spec.js`, `src/chains/date/index.examples.js`
- **Processor**: `(inputs) => date(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 14

### chains.detect-patterns

- **Rows**: 2
- **Files**: `src/chains/detect-patterns/index.spec.js`, `src/chains/detect-patterns/index.examples.js`
- **Processor**: `(inputs) => detectPatterns(inputs)`
- **Total claims**: 8

### chains.detect-threshold

- **Rows**: 2
- **Files**: `src/chains/detect-threshold/index.spec.js`, `src/chains/detect-threshold/index.examples.js`
- **Processor (varies)**: `(...args) => detectThreshold(...args)` / `(inputs) => detectThreshold(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 15

### chains.disambiguate

- **Rows**: 2
- **Files**: `src/chains/disambiguate/index.spec.js`, `src/chains/disambiguate/index.examples.js`
- **Processor**: `(inputs) => disambiguate(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### chains.dismantle

- **Rows**: 2
- **Files**: `src/chains/dismantle/index.spec.js`, `src/chains/dismantle/index.examples.js`
- **Processor (varies)**: `(inputs) => dismantle(inputs)` / `(inputs) => Dismantle(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 6

### chains.document-shrink

- **Rows**: 2
- **Files**: `src/chains/document-shrink/index.spec.js`, `src/chains/document-shrink/index.examples.js`
- **Processor**: `(inputs) => documentShrink(inputs)`
- **Total claims**: 16

### chains.entities

- **Rows**: 2
- **Files**: `src/chains/entities/index.spec.js`, `src/chains/entities/index.examples.js`
- **Processor**: `(inputs) => entityItem(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent, InstructionBundle
- **Total claims**: 16

### chains.expect

- **Rows**: 2
- **Files**: `src/chains/expect/index.spec.js`, `src/chains/expect/index.examples.js`
- **Processor (varies)**: `(inputs) => expect(inputs)` / `(inputs) => aiExpect(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 28

### chains.extract-blocks

- **Rows**: 2
- **Files**: `src/chains/extract-blocks/index.spec.js`, `src/chains/extract-blocks/index.examples.js`
- **Processor**: `(inputs) => extractBlocks(inputs)`
- **Factories**: LlmMockResponse, ChainConfig
- **Total claims**: 28

### chains.filter

- **Rows**: 2
- **Files**: `src/chains/filter/index.spec.js`, `src/chains/filter/index.examples.js`
- **Processor**: `(inputs) => filter(inputs)`
- **Factories**: ChainConfig, ProgressEvent
- **Total claims**: 17

### chains.filter-ambiguous

- **Rows**: 2
- **Files**: `src/chains/filter-ambiguous/index.spec.js`, `src/chains/filter-ambiguous/index.examples.js`
- **Processor**: `(inputs) => filterAmbiguous(inputs)`
- **Total claims**: 2

### chains.find

- **Rows**: 2
- **Files**: `src/chains/find/index.spec.js`, `src/chains/find/index.examples.js`
- **Processor**: `(inputs) => find(inputs)`
- **Factories**: ChainConfig
- **Total claims**: 9

### chains.glossary

- **Rows**: 2
- **Files**: `src/chains/glossary/index.spec.js`, `src/chains/glossary/index.examples.js`
- **Processor**: `(inputs) => glossary(inputs)`
- **Total claims**: 9

### chains.group

- **Rows**: 2
- **Files**: `src/chains/group/index.spec.js`, `src/chains/group/index.examples.js`
- **Processor**: `(inputs) => group(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, InstructionBundle
- **Total claims**: 13

### chains.intersections

- **Rows**: 2
- **Files**: `src/chains/intersections/index.spec.js`, `src/chains/intersections/index.examples.js`
- **Processor (varies)**: `(...args) => intersections(...args)` / `(inputs) => intersections(inputs)`
- **Factories**: LlmMockResponse, ChainConfig
- **Total claims**: 18

### chains.join

- **Rows**: 2
- **Files**: `src/chains/join/index.spec.js`, `src/chains/join/index.examples.js`
- **Processor**: `(inputs) => join(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 5

### chains.list

- **Rows**: 2
- **Files**: `src/chains/list/index.spec.js`, `src/chains/list/index.examples.js`
- **Processor**: `(inputs) => list(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### chains.map

- **Rows**: 2
- **Files**: `src/chains/map/index.spec.js`, `src/chains/map/index.examples.js`
- **Processor (varies)**: `async function* (inputs) { yield* map(inputs) }` / `(inputs) => map(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent
- **Total claims**: 27

### chains.people

- **Rows**: 2
- **Files**: `src/chains/people/index.spec.js`, `src/chains/people/index.examples.js`
- **Processor**: `(inputs) => peopleSet(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent
- **Total claims**: 10

### chains.pop-reference

- **Rows**: 2
- **Files**: `src/chains/pop-reference/index.spec.js`, `src/chains/pop-reference/index.examples.js`
- **Processor**: `(inputs) => popReferenceItem(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent
- **Total claims**: 14

### chains.reduce

- **Rows**: 2
- **Files**: `src/chains/reduce/index.spec.js`, `src/chains/reduce/index.examples.js`
- **Processor**: `(inputs) => reduce(inputs)`
- **Factories**: LlmMockResponse, ChainConfig
- **Total claims**: 18

### chains.relations

- **Rows**: 2
- **Files**: `src/chains/relations/index.spec.js`, `src/chains/relations/index.examples.js`
- **Processor**: `(inputs) => relationItem(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, InstructionBundle
- **Total claims**: 21

### chains.scale

- **Rows**: 2
- **Files**: `src/chains/scale/index.spec.js`, `src/chains/scale/index.examples.js`
- **Processor**: `(inputs) => scaleItem(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent, InstructionBundle
- **Total claims**: 21

### chains.score

- **Rows**: 2
- **Files**: `src/chains/score/index.spec.js`, `src/chains/score/index.examples.js`
- **Processor (varies)**: `(inputs) => score(...spread(inputs))` / `(inputs) => score(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent, InstructionBundle
- **Total claims**: 32

### chains.score-matrix

- **Rows**: 2
- **Files**: `src/chains/score-matrix/index.spec.js`, `src/chains/score-matrix/index.examples.js`
- **Processor**: `(inputs) => scoreMatrix(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, InstructionBundle
- **Total claims**: 37

### chains.set-interval

- **Rows**: 2
- **Files**: `src/chains/set-interval/index.spec.js`, `src/chains/set-interval/index.examples.js`
- **Processor (varies)**: `(steps) => runWithFakeTimers(steps)` / `(inputs) => setInterval(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 5

### chains.socratic

- **Rows**: 2
- **Files**: `src/chains/socratic/index.spec.js`, `src/chains/socratic/index.examples.js`
- **Processor (varies)**: `(inputs) => socratic(inputs)` / `(inputs) => SocraticMethod(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### chains.sort

- **Rows**: 2
- **Files**: `src/chains/sort/index.spec.js`, `src/chains/sort/index.examples.js`
- **Processor (varies)**: `(inputs) => sort(...spread(inputs))` / `(inputs) => sort(inputs)`
- **Factories**: LlmMockResponse, ChainConfig
- **Total claims**: 3

### chains.split

- **Rows**: 2
- **Files**: `src/chains/split/index.spec.js`, `src/chains/split/index.examples.js`
- **Processor (varies)**: `(inputs) => split(...spread(inputs))` / `(inputs) => split(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 16

### chains.summary-map

- **Rows**: 2
- **Files**: `src/chains/summary-map/index.spec.js`, `src/chains/summary-map/index.examples.js`
- **Processor (varies)**: `(inputs) => SummaryMap(...spread(inputs))` / `(inputs) => SummaryMap(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 7

### chains.tag-vocabulary

- **Rows**: 2
- **Files**: `src/chains/tag-vocabulary/index.spec.js`, `src/chains/tag-vocabulary/index.examples.js`
- **Processor**: `(inputs) => tagVocabulary(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 14

### chains.tags

- **Rows**: 2
- **Files**: `src/chains/tags/index.spec.js`, `src/chains/tags/index.examples.js`
- **Processor**: `(inputs) => tagItem(inputs)`
- **Factories**: LlmMockResponse, InstructionBundle
- **Total claims**: 11

### chains.test

- **Rows**: 2
- **Files**: `src/chains/test/index.spec.js`, `src/chains/test/index.examples.js`
- **Processor**: `(inputs) => test(inputs)`
- **Factories**: LlmMockResponse, ProgressEvent
- **Total claims**: 15

### chains.themes

- **Rows**: 2
- **Files**: `src/chains/themes/index.spec.js`, `src/chains/themes/index.examples.js`
- **Processor**: `(inputs) => themes(inputs)`
- **Factories**: ChainConfig
- **Total claims**: 8

### chains.timeline

- **Rows**: 2
- **Files**: `src/chains/timeline/index.spec.js`, `src/chains/timeline/index.examples.js`
- **Processor**: `(inputs) => timeline(inputs)`
- **Factories**: LlmMockResponse, ChainConfig, ProgressEvent
- **Total claims**: 23

### chains.to-object

- **Rows**: 2
- **Files**: `src/chains/to-object/index.spec.js`, `src/chains/to-object/index.examples.js`
- **Processor**: `(inputs) => toObject(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### chains.truncate

- **Rows**: 2
- **Files**: `src/chains/truncate/index.spec.js`, `src/chains/truncate/index.examples.js`
- **Processor (varies)**: `(inputs) => truncate(inputs)` / `(inputs) => truncate(...spread(inputs))`
- **Total claims**: 9

### chains.veiled-variants

- **Rows**: 2
- **Files**: `src/chains/veiled-variants/index.spec.js`, `src/chains/veiled-variants/index.examples.js`
- **Processor**: `(inputs) => veiledVariants(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### embed.local

- **Rows**: 2
- **Files**: `src/embed/local.spec.js`, `src/embed/local.examples.js`
- **Processor**: `(inputs) => local(inputs)`
- **Total claims**: 15

### lib.prompt-piece.advisors

- **Rows**: 2
- **Files**: `src/lib/prompt-piece/advisors.spec.js`, `src/lib/prompt-piece/advisors.examples.js`
- **Processor**: `(inputs) => reshape(inputs)`
- **Total claims**: 20

### lib.text-similarity

- **Rows**: 2
- **Files**: `src/lib/text-similarity/index.spec.js`, `src/lib/text-similarity/index.examples.js`
- **Processor**: `(inputs) => TextSimilarity(inputs)`
- **Total claims**: 35

### verblets.auto

- **Rows**: 2
- **Files**: `src/verblets/auto/index.spec.js`, `src/verblets/auto/index.examples.js`
- **Processor**: `(inputs) => auto(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### verblets.bool

- **Rows**: 2
- **Files**: `src/verblets/bool/index.spec.js`, `src/verblets/bool/index.examples.js`
- **Processor**: `(inputs) => bool(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### verblets.central-tendency-lines

- **Rows**: 2
- **Files**: `src/verblets/central-tendency-lines/index.spec.js`, `src/verblets/central-tendency-lines/index.examples.js`
- **Processor (varies)**: `(...args) => centralTendency(...args)` / `(inputs) => centralTendency(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 6

### verblets.commonalities

- **Rows**: 2
- **Files**: `src/verblets/commonalities/index.spec.js`, `src/verblets/commonalities/index.examples.js`
- **Processor**: `(inputs) => commonalities(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 10

### verblets.embed-multi-query

- **Rows**: 2
- **Files**: `src/verblets/embed-multi-query/index.spec.js`, `src/verblets/embed-multi-query/index.examples.js`
- **Processor**: `(inputs) => embedMultiQuery(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### verblets.embed-rewrite-query

- **Rows**: 2
- **Files**: `src/verblets/embed-rewrite-query/index.spec.js`, `src/verblets/embed-rewrite-query/index.examples.js`
- **Processor**: `(inputs) => embedRewriteQuery(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 3

### verblets.embed-step-back

- **Rows**: 2
- **Files**: `src/verblets/embed-step-back/index.spec.js`, `src/verblets/embed-step-back/index.examples.js`
- **Processor**: `(inputs) => embedStepBack(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### verblets.embed-subquestions

- **Rows**: 2
- **Files**: `src/verblets/embed-subquestions/index.spec.js`, `src/verblets/embed-subquestions/index.examples.js`
- **Processor**: `(inputs) => embedSubquestions(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 4

### verblets.enum

- **Rows**: 2
- **Files**: `src/verblets/enum/index.spec.js`, `src/verblets/enum/index.examples.js`
- **Processor**: `(inputs) => enumValue(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 1

### verblets.expect

- **Rows**: 2
- **Files**: `src/verblets/expect/index.spec.js`, `src/verblets/expect/index.examples.js`
- **Processor (varies)**: `(inputs) => aiExpect(inputs)` / `(inputs) => aiExpectVerblet(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 11

### verblets.fill-missing

- **Rows**: 2
- **Files**: `src/verblets/fill-missing/index.spec.js`, `src/verblets/fill-missing/index.examples.js`
- **Processor**: `(inputs) => fillMissing(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### verblets.intent

- **Rows**: 2
- **Files**: `src/verblets/intent/index.spec.js`, `src/verblets/intent/index.examples.js`
- **Processor (varies)**: `(inputs) => intent(inputs)` / `(inputs) => intent(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 1

### verblets.list-expand

- **Rows**: 2
- **Files**: `src/verblets/list-expand/index.spec.js`, `src/verblets/list-expand/index.examples.js`
- **Processor**: `(inputs) => listExpand(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### verblets.name

- **Rows**: 2
- **Files**: `src/verblets/name/index.spec.js`, `src/verblets/name/index.examples.js`
- **Processor**: `(inputs) => name(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### verblets.name-similar-to

- **Rows**: 2
- **Files**: `src/verblets/name-similar-to/index.spec.js`, `src/verblets/name-similar-to/index.examples.js`
- **Processor**: `(inputs) => nameSimilarTo(inputs)`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### verblets.number

- **Rows**: 2
- **Files**: `src/verblets/number/index.spec.js`, `src/verblets/number/index.examples.js`
- **Processor**: `(inputs) => number(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 5

### verblets.number-with-units

- **Rows**: 2
- **Files**: `src/verblets/number-with-units/index.spec.js`, `src/verblets/number-with-units/index.examples.js`
- **Processor (varies)**: `(inputs) => numberWithUnits(inputs)` / `(inputs) => numberWithUnits(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 5

### verblets.schema-org

- **Rows**: 2
- **Files**: `src/verblets/schema-org/index.spec.js`, `src/verblets/schema-org/index.examples.js`
- **Processor (varies)**: `(inputs) => schemaOrg(inputs)` / `(inputs) => schemaOrg(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 2

### verblets.sentiment

- **Rows**: 2
- **Files**: `src/verblets/sentiment/index.spec.js`, `src/verblets/sentiment/index.examples.js`
- **Processor (varies)**: `(inputs) => sentiment(inputs)` / `(inputs) => sentiment(...spread(inputs))`
- **Factories**: LlmMockResponse
- **Total claims**: 6

## Singletons (183)

Files whose tests don't share a processor with any other file. Listed for completeness; many will absorb into shared groups during migration.

| Group / file id | Surface | Rows | Pattern | Factories |
|---|---|---:|---|---|
| `arch.repo` | arch | 10 | `imperative` | — |
| `chains.ai-arch-expect.stress` | stress | 22 | `imperative` | — |
| `chains.analyze-image.github-trending` | examples | 11 | `imperative` | LlmMockResponse |
| `chains.analyze-image.stress` | stress | 32 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.analyze-image.wikipedia-companies` | examples | 12 | `imperative` | LlmMockResponse, ChainConfig |
| `chains.calibrate.stress` | stress | 47 | `imperative` | LlmMockResponse, ProgressEvent, Scan, InstructionBundle |
| `chains.central-tendency.stress` | stress | 37 | `imperative` | ChainConfig, ProgressEvent |
| `chains.collect-terms.stress` | stress | 29 | `imperative` | ProgressEvent |
| `chains.conversation-turn-reduce` | spec | 8 | `imperative` | — |
| `chains.conversation-turn-reduce.stress` | stress | 25 | `imperative` | ProgressEvent |
| `chains.conversation.stress` | stress | 50 | `imperative` | ProgressEvent |
| `chains.conversation.turn-policies` | spec | 10 | `imperative` | — |
| `chains.date.stress` | stress | 20 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.detect-patterns.stress` | stress | 40 | `imperative` | ProgressEvent |
| `chains.detect-threshold.stress` | stress | 18 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.disambiguate.stress` | stress | 29 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.dismantle.stress` | stress | 28 | `imperative` | LlmMockResponse, InstructionBundle |
| `chains.embed-object-define` | spec | 17 | `imperative` | LlmMockResponse, InstructionBundle |
| `chains.embed-object-fragment` | spec | 7 | `imperative` | LlmMockResponse, ChainConfig |
| `chains.embed-object-fragment.stress` | stress | 21 | `imperative` | LlmMockResponse, ChainConfig, ProgressEvent |
| `chains.embed-object-refine` | spec | 6 | `imperative` | LlmMockResponse |
| `chains.embed-object-refine.stress` | stress | 36 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.entities.stress` | stress | 29 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.expect.stress` | stress | 13 | `imperative` | LlmMockResponse |
| `chains.filter-ambiguous.stress` | stress | 29 | `imperative` | ProgressEvent |
| `chains.filter.stress` | stress | 35 | `imperative` | ChainConfig, ProgressEvent |
| `chains.find.stress` | stress | 44 | `imperative` | ChainConfig, ProgressEvent |
| `chains.glossary.stress` | stress | 32 | `imperative` | ProgressEvent |
| `chains.group.stress` | stress | 41 | `imperative` | ChainConfig, ProgressEvent, InstructionBundle |
| `chains.intersections.stress` | stress | 37 | `imperative` | LlmMockResponse, ChainConfig, ProgressEvent |
| `chains.join.stress` | stress | 25 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.list.stress` | stress | 39 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.llm-logger` | spec | 20 | `interactive` | — |
| `chains.map.stress` | stress | 91 | `imperative` | ChainConfig, ProgressEvent |
| `chains.map.structured-extraction` | examples | 1 | `imperative` | ChainConfig |
| `chains.option-history-analyzer` | spec | 25 | `imperative` | LlmMockResponse |
| `chains.option-history-analyzer.stress` | stress | 23 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.people.stress` | stress | 25 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.pop-reference.stress` | stress | 27 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.questions` | examples | 1 | `imperative` | — |
| `chains.questions.stress` | stress | 44 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.reduce.stress` | stress | 36 | `imperative` | ChainConfig, ProgressEvent |
| `chains.relations.stress` | stress | 45 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.scale.stress` | stress | 37 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.scan-js` | examples | 2 | `imperative` | — |
| `chains.score.stress` | stress | 21 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.set-interval.stress` | stress | 17 | `imperative` | LlmMockResponse |
| `chains.site-crawl` | spec | 19 | `imperative` | LlmMockResponse |
| `chains.site-crawl.cooldown` | spec | 21 | `imperative` | — |
| `chains.site-crawl.frontier` | spec | 17 | `imperative` | — |
| `chains.socratic.stress` | stress | 48 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.sort.stress` | stress | 35 | `imperative` | LlmMockResponse, ChainConfig, ProgressEvent |
| `chains.split.stress` | stress | 36 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.summary-map.stress` | stress | 20 | `imperative` | LlmMockResponse |
| `chains.tag-vocabulary.stress` | stress | 32 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.tags.stress` | stress | 40 | `imperative` | LlmMockResponse, ProgressEvent, InstructionBundle |
| `chains.test-advice` | examples | 2 | `imperative` | — |
| `chains.test-advice.stress` | stress | 28 | `imperative` | ProgressEvent |
| `chains.test-analysis` | examples | 7 | `imperative` | — |
| `chains.test-analysis.config` | spec | 21 | `imperative` | — |
| `chains.test-analyzer` | examples | 2 | `imperative` | — |
| `chains.test-analyzer.stress` | stress | 27 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.themes.stress` | stress | 33 | `imperative` | ProgressEvent |
| `chains.timeline.stress` | stress | 42 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.truncate.stress` | stress | 33 | `imperative` | ProgressEvent |
| `chains.value-arbitrate` | spec | 45 | `imperative` | LlmMockResponse |
| `chains.value-arbitrate.stress` | stress | 28 | `imperative` | LlmMockResponse |
| `chains.veiled-variants.stress` | stress | 31 | `imperative` | LlmMockResponse, ProgressEvent |
| `chains.web-scrape` | spec | 53 | `imperative` | — |
| `chains.web-scrape.browser-tools` | spec | 5 | `imperative` | — |
| `constants.arch` | spec | 6 | `imperative` | — |
| `constants.arch-debug` | spec | 5 | `imperative` | — |
| `constants.context` | spec | 8 | `imperative` | — |
| `constants.env-vars` | spec | 18 | `imperative` | — |
| `constants.models-config` | spec | 21 | `imperative` | — |
| `embed.embed-object` | spec | 13 | `imperative` | — |
| `embed.match` | spec | 8 | `imperative` | — |
| `embed.neighbor-chunks` | spec | 10 | `imperative` | — |
| `embed.normalize-text` | spec | 9 | `imperative` | — |
| `embed.plan-read` | spec | 6 | `imperative` | — |
| `embed.read` | spec | 11 | `imperative` | — |
| `embed.score-chunks-by-probes` | spec | 7 | `imperative` | — |
| `embed.shape-state` | spec | 9 | `imperative` | — |
| `embed.vector-ops` | spec | 18 | `imperative` | — |
| `init` | spec | 18 | `imperative` | LlmMockResponse |
| `lib.agent` | spec | 34 | `imperative` | ProgressEvent |
| `lib.any-signal` | spec | 7 | `imperative` | — |
| `lib.automation-runner` | spec | 3 | `imperative` | — |
| `lib.chunk-sentences` | spec | 8 | `imperative` | — |
| `lib.collect-events-with` | spec | 8 | `imperative` | InstructionBundle |
| `lib.collection.parallel` | spec | 23 | `imperative` | ChainConfig |
| `lib.collection.sequential` | spec | 16 | `imperative` | — |
| `lib.combinations` | spec | 14 | `imperative` | — |
| `lib.config` | spec | 27 | `imperative` | — |
| `lib.context` | spec | 73 | `imperative` | ProgressEvent, InstructionBundle |
| `lib.context-budget` | spec | 7 | `imperative` | — |
| `lib.context.builder` | spec | 21 | `imperative` | Scan, InstructionBundle |
| `lib.context.descriptor` | spec | 5 | `imperative` | — |
| `lib.context.observers` | spec | 9 | `imperative` | — |
| `lib.context.option` | spec | 49 | `imperative` | — |
| `lib.context.option-detail` | spec | 9 | `imperative` | — |
| `lib.debug` | spec | 7 | `imperative` | — |
| `lib.expect-shape` | spec | 30 | `imperative` | — |
| `lib.extract-json` | spec | 13 | `imperative` | — |
| `lib.image-utils` | spec | 15 | `imperative` | — |
| `lib.instruction` | spec | 34 | `imperative` | ChainConfig, InstructionBundle |
| `lib.llm` | spec | 15 | `imperative` | LlmMockResponse |
| `lib.llm.provider-smoke` | examples | 1 | `imperative` | — |
| `lib.llm.providers.anthropic` | spec | 46 | `imperative` | — |
| `lib.llm.providers.openai` | spec | 6 | `imperative` | — |
| `lib.llm.telemetry` | spec | 19 | `interactive` | LlmMockResponse |
| `lib.llm.telemetry-integration` | spec | 5 | `interactive` | LlmMockResponse |
| `lib.llm.vision` | spec | 4 | `imperative` | — |
| `lib.normalize-llm` | spec | 8 | `imperative` | — |
| `lib.parallel-batch` | spec | 26 | `imperative` | ChainConfig |
| `lib.parse-js-parts` | spec | 6 | `object-driven` | — |
| `lib.parse-llm-list` | spec | 9 | `imperative` | — |
| `lib.path-aliases` | spec | 7 | `object-driven` | — |
| `lib.pave` | spec | 13 | `object-driven` | — |
| `lib.pipe` | spec | 9 | `imperative` | — |
| `lib.progress` | spec | 51 | `imperative` | ChainConfig, ProgressEvent |
| `lib.prompt-piece.composition` | spec | 5 | `imperative` | — |
| `lib.pure` | spec | 39 | `imperative` | — |
| `lib.retry` | spec | 19 | `interactive` | — |
| `lib.ring-buffer` | spec | 49 | `interactive` | — |
| `lib.ring-buffer-redis` | spec | 21 | `object-driven` | — |
| `lib.run-context` | spec | 7 | `imperative` | — |
| `lib.run-context.data-store` | spec | 17 | `imperative` | — |
| `lib.run-context.emit` | spec | 4 | `imperative` | — |
| `lib.run-context.exec` | spec | 2 | `imperative` | — |
| `lib.run-context.file-ops` | spec | 19 | `imperative` | — |
| `lib.run-context.media-encoding` | spec | 6 | `imperative` | — |
| `lib.search-best-first` | spec | 2 | `imperative` | — |
| `lib.search-best-first.city-walk` | spec | 1 | `imperative` | — |
| `lib.search-js-files` | spec | 4 | `imperative` | — |
| `lib.shorten-text` | spec | 7 | `object-driven` | — |
| `lib.shuffle` | spec | 6 | `imperative` | — |
| `lib.strip-numeric` | spec | 8 | `imperative` | — |
| `lib.strip-response` | spec | 11 | `imperative` | — |
| `lib.targeting-rule` | spec | 29 | `imperative` | — |
| `lib.temp-files` | spec | 16 | `imperative` | — |
| `lib.template-builder` | spec | 14 | `imperative` | — |
| `lib.template-replace` | spec | 11 | `imperative` | — |
| `lib.test-utils.config-integration` | spec | 15 | `imperative` | LlmMockResponse, ChainConfig, ProgressEvent |
| `lib.test-utils.mapper-contracts` | spec | 18 | `it.each-tuple` | — |
| `lib.test-utils.schema-contracts` | spec | 1 | `it.each-tuple` | LlmMockResponse |
| `lib.text-batch` | spec | 11 | `imperative` | ChainConfig |
| `lib.timed-abort-controller` | spec | 6 | `interactive` | — |
| `lib.to-bool` | spec | 11 | `imperative` | — |
| `lib.to-date` | spec | 7 | `imperative` | — |
| `lib.to-enum` | spec | 8 | `imperative` | — |
| `lib.to-number` | spec | 8 | `imperative` | — |
| `lib.to-number-with-units` | spec | 10 | `imperative` | — |
| `lib.trace-collector` | spec | 16 | `imperative` | — |
| `lib.window-for` | spec | 7 | `imperative` | — |
| `lib.with-config` | spec | 17 | `imperative` | ChainConfig |
| `lib.with-inactivity-timeout` | spec | 6 | `interactive` | — |
| `prompts.as-enum` | spec | 4 | `imperative` | — |
| `prompts.as-json-schema` | spec | 4 | `imperative` | — |
| `prompts.as-object-with-schema` | spec | 6 | `imperative` | — |
| `prompts.as-schema-org-text` | spec | 8 | `imperative` | — |
| `prompts.blog-post` | spec | 4 | `imperative` | — |
| `prompts.code-features` | spec | 6 | `imperative` | — |
| `prompts.embed-query-transforms` | spec | 20 | `imperative` | — |
| `prompts.generate-collection` | spec | 7 | `imperative` | — |
| `prompts.generate-list` | spec | 9 | `imperative` | — |
| `prompts.generate-questions` | spec | 7 | `imperative` | — |
| `prompts.intent` | spec | 11 | `imperative` | — |
| `prompts.prompt-piece` | spec | 8 | `imperative` | — |
| `prompts.select-from-threshold` | spec | 5 | `imperative` | — |
| `prompts.sort` | spec | 8 | `imperative` | — |
| `prompts.style` | spec | 15 | `imperative` | InstructionBundle |
| `prompts.summarize` | spec | 7 | `imperative` | — |
| `prompts.wrap-list` | spec | 6 | `imperative` | — |
| `prompts.wrap-variable` | spec | 20 | `imperative` | — |
| `services.embedding-model.loaders` | spec | 9 | `imperative` | ChainConfig |
| `services.embedding-model.negotiate` | spec | 20 | `imperative` | — |
| `services.llm-model.negotiate` | spec | 38 | `imperative` | — |
| `services.redis.config` | spec | 4 | `imperative` | — |
| `verblets.embed-rewrite-to-output-doc` | spec | 1 | `imperative` | LlmMockResponse |
| `verblets.list-batch` | spec | 27 | `it.each-tuple` | LlmMockResponse |
| `verblets.phail-forge` | spec | 4 | `imperative` | LlmMockResponse |
| `verblets.suggest-targeting-rules` | spec | 12 | `imperative` | LlmMockResponse |
