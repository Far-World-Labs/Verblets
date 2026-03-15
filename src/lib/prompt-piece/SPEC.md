# Spec: AI Operations for the Prompt/Data Core and Optional UI Layer

This replaces the existing prompt/graph utilities completely. It does not define new code in relation to any prior implementation.

## Terminology

### Operational terms

| Term               | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Piece**          | Reusable source text that may later execute or supply material to other pieces                  |
| **Piece revision** | An immutable edited version of a piece definition                                               |
| **Piece instance** | A live materialization of one piece revision with current input resolution state                |
| **Input area**     | A named or append-style insertion point on a piece revision                                     |
| **Mapping rule**   | A deterministic rule on an input area that resolves candidate sources by tags only              |
| **Mapping**        | The current resolved connection from a source piece or output into an input area on an instance |
| **Sealed piece**   | A frozen execution-ready rendering of an instance                                               |
| **Output**         | Immutable result produced from a sealed piece                                                   |
| **Routing tag**    | An approved operational tag used for matching sources to input areas                            |

### Helpful classification only

These are not core low-level objects.

| Term         | Correspondence                                                            |
| ------------ | ------------------------------------------------------------------------- |
| **Document** | UI-facing view of a piece                                                 |
| **Result**   | UI-facing view of an output                                               |
| **Feed**     | UI-facing viewmodel derived from an input area plus current mapping state |

"Feed" is UI terminology only. It must not appear in the core implementation model.

## Non-AI core behavior

The core system is deterministic.

* piece revisions declare input areas
* input areas carry mapping rules based on routing tags only
* instances hold current mappings
* mapping resolution uses only approved routing tags
* sealing requires all required input areas to resolve
* execution consumes sealed pieces and emits outputs
* upstream changes mark dependent instances stale
* rerun propagates through instance mappings
* manual overrides change mappings on instances only

### Tag-based mapping

Input areas should use simple tag rules.

* A rule names one or more required routing tags
* A source qualifies when it has all required routing tags
* Single-valued input areas require review if multiple sources qualify
* Multi-valued or append input areas may accept all qualifying sources in stable order
* Manual override may pin a different source or set of sources for that instance only
* Approved routing tags are the only matching mechanism

## AI-required operational capabilities

These are the non-superficial operations that need generative AI. They should be implementable as small focused map/reduce-friendly operations, not as one large global pass.

### 1. Piece structure discovery and reshape proposal → `promptPieceReshape`

Purpose:

* discover what additional input areas a piece likely needs
* propose reshaping a piece so it can accept new material cleanly
* propose attached option choices when those are structurally useful

Trigger:

* new piece creation
* piece revision edit
* manual request to accommodate new source material
* repeated manual overrides that suggest the structure is wrong

Inputs:

* current piece revision text
* existing input areas on that piece
* current approved routing tag registry summary (with optional examples)
* local source examples relevant to this piece
* optional manual note about intended new material

Outputs:

* proposed input area additions, removals, and modifications (action + area details)
* proposed text edit suggestions for the piece revision
* proposed routing intent (suggestedTags) for each new or changed input area
* proposal records only; nothing applies automatically

### 2. Input-area routing tag proposal → `promptPieceProposeTags`

Purpose:

* assign or revise routing tags on input areas so future outputs or pieces can auto-map into them

Trigger:

* new input area proposed or approved
* existing input area edited
* manual mapping override reveals missing routing intent

Inputs:

* the local piece revision
* the input area label and guidance
* approved routing tag registry summary
* nearby input areas on the same piece to avoid duplication

Outputs:

* recommended routing tags for that input area
* optional recommendation to reuse an existing routing tag rather than create a new one
* proposed new routing tag only when no existing tag fits

### 3. Source routing tag assignment → `promptTagSource`

Purpose:

* assign routing tags to pieces and outputs so they can participate in automatic mapping

Trigger:

* new piece revision saved
* new output created
* manual request to retag
* approved reshape that changes the routing role of a piece

Inputs:

* source text or a bounded slice of it
* source kind: piece or output
* local upstream context for outputs (upstreamContext)
* current piece revision, if tagging an output (pieceText)
* approved routing tag registry summary
* nearby input-area routing rules from likely consumer pieces (consumerHints)

Outputs:

* recommended routing tags for the source (with rationale per tag)
* confidence and whether human approval is needed
* no changes to mappings directly

### 4. Tag alignment repair proposal → `promptTagReconcile`

Purpose:

* repair the system when users manually connect sources that the current tags do not explain

Trigger:

* manual override from a source that does not satisfy an input area's routing tags

Inputs:

* source text slice
* source approved routing tags
* target input label, tags, and guidance text (inputLabel, inputTags, inputGuidance)
* approved routing tag registry summary

Outputs:

* recommend adding an existing routing tag to the source
* recommend changing the input area routing tags
* recommend a new routing tag only if neither side fits existing tags
* never auto-apply

### 5. Routing tag registry refinement → `promptTagConsolidate`

Purpose:

* keep routing tags stable and small over time

Trigger:

* periodic maintenance
* excessive near-duplicate proposed tags
* growing manual override volume

Inputs:

* lossified summary of approved routing tags (with optional representative examples per tag)
* usage counts
* unresolved proposal clusters

Outputs:

* proposed merges
* proposed deprecations
* proposed clearer canonical names
* migration suggestions for affected input areas and sources

This should be a reduce-style operation over summaries, not a full raw-corpus pass.

## Context requirements by operation

Use only the minimum context needed.

* Structure discovery needs the local piece and a compact registry summary
* Input-area routing proposal needs the local input area and existing approved tags
* Source tag assignment needs the local source plus registry summary and compact consumer-rule hints
* Alignment repair needs only the mismatched source and target
* Registry refinement needs aggregate summaries, not full text bodies

Broad projections over all pieces or outputs should be avoided except through summarized reduce artifacts.

## Implementation mapping

### Library layer (pure, deterministic)

| Module | Provides |
| --- | --- |
| `src/lib/prompt-markers/` | Text surgery: `extractSections`, `insertSections` (placeholders via `{key}` syntax, inventory on piece.inputs) |
| `src/lib/prompt-piece/` | Piece construction, rendering, tag matching, inspection |
| `src/lib/prompt-routing/` | Connections: `promptConnectParts`, `promptConnectUpstream`, `promptConnectDownstream`. Planning: `promptRunOrder`, `promptDetectCycles` |

### Chain layer (AI advisors via `createAdvisor`)

| Chain | Function | Schema |
| --- | --- | --- |
| `src/chains/extend-prompt/` | `promptPieceReshape` (default) | `value{inputChanges[], textSuggestions[]}` |
| | `promptPieceProposeTags` | `items[]` |
| | `promptTagSource` | `items[]` |
| | `promptTagReconcile` | `value{}` |
| | `promptTagConsolidate` | `value{}` |

### App layer (not in this library)

* Instance lifecycle (output, staleness, source tags)
* Network collections, instance naming
* Execution orchestration
* Staleness propagation and incremental re-execution
* Pinning and manual override persistence

## UI-only AI operations

No UI-only prompt chains are required for core operation.

The UI should be driven by deterministic viewmodels over the core state:

* document view from piece revision + instance + output history
* feed view from input area + mapping rule + current mapping
* provenance view from sealed piece and upstream mappings

If any UI-only AI is later added, it should remain optional and must not affect routing, sealing, execution, or staleness.
