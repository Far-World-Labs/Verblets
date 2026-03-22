# §1i Prompt Engineering

## Levels

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Inline string concatenation, no shared utilities | collect-terms, document-shrink |
| 1 | Uses `asXML` for variable wrapping | 25+ chains |
| 2 | Extracted prompt builder functions, uses `promptConstants` | group, category-samples |
| 3 | System prompts, temperature tuning, `response_format` with JSON schemas | scale, sort, dismantle |
| 4 | Multi-stage prompt pipelines, frequency/presence penalty tuning | anonymize, tag-vocabulary, dismantle |

## Prompt Fragment Library

`src/prompts/constants.js` — 62 exported one-liner prompt fragments organized
into categories. This is a significant asset that is greatly under-utilized.

**Usage inventory (23 used, 39 unused):**

*Actively used in chains/verblets:*
asUndefinedByDefault, asBool, asNumber, asDate, asJSON, asWrappedArrayJSON,
asWrappedValueJSON, strictFormat, tryCompleteData, onlyJSON, onlyJSONArray,
onlyJSONStringArray, asNumberWithUnits, shapeAsJSON, contentIsQuestion,
contentIsInstructions, contentIsMain, contentToJSON, contentIsChoices,
contentIsTransformationSource, contentIsSchema, explainAndSeparate,
explainAndSeparateJSON, explainAndSeparatePrimitive

*Used only inside src/prompts/ helper modules (not in chains directly):*
onlyJSONObjectArray, onlyJSONStringArrayAlt1, contentIsDetails, contentIsFixes,
contentListCriteria, contentListItemCriteria, contentListToOmit,
contentIsExampleObject (7 fragments)

*Completely unused anywhere:*
useLineNumber, noFalseInformation, onlyJSONStringArrayPerLine,
asSplitIntoJSONArray, onlyFullCode, contentIsExample, contentHasIntent,
contentIsSortCriteria, contentIsIntent, contentIsOperationOption,
contentIsParametersOptions, thinkStepByStep, identifyUnclearInfo,
argueAgainstOutput, rateBasic, rateSatisfaction, rewriteBasedOnRating,
requestAdditionalInput, summarizeRequest, considerProsCons, provideExamples,
explainReasoning, alternativeSolutions, explainToChild, identifyAssumptions,
alternativeInterpretations, evidenceSupportsView, expertResponse,
limitationsOfApproach, missingInformation, evaluateDifferingViews,
confidenceInResponse, lessKnowledgeResponse, analogyForUnderstanding (32 fragments)

The entire Reflective (8), Analytical (7), and Evidence-Based (8) sections have
zero usage. These represent prompt engineering patterns that were cataloged
but never wired into any module.

## Prompt Helper Modules

`src/prompts/` also contains 18 non-constant modules that build structured
prompt sections. These are higher-level than constants:

| Module | Purpose | Used by |
|--------|---------|---------|
| `wrap-variable.js` (asXML, quote) | XML-wrap variables for prompts | 25+ chains |
| `generate-list.js` | List generation prompt builder | list chain |
| `generate-collection.js` | Collection generation | list chain |
| `generate-questions.js` | Question generation | questions chain |
| `sort.js` | Sort comparison prompt | sort chain |
| `summarize.js` | Summarization prompt | summary-map chain |
| `style.js` | Style analysis prompt | ? |
| `intent.js` | Intent extraction prompt | ? |
| `select-from-threshold.js` | Threshold selection | ? |
| `as-enum.js` | Enum selection prompt | enum verblet |
| `as-json-schema.js` | Schema instruction | to-object chain |
| `as-object-with-schema.js` | Object schema prompt | to-object chain |
| `token-budget.js` | Token budget instruction | ? |
| `wrap-list.js` | List wrapping | ? |
| `blog-post.js` | Blog post prompt | ? |
| `code-features.js` | Code feature extraction | ? |
| `output-succinct-names.js` | Name output formatting | ? |
| `as-schema-org-text/type.js` | Schema.org formatting | ? |

(? = usage not yet audited)

## Prompt Management Concerns

### Current state: hardcoded and implementation-coupled

Prompts in verblets are inline template literals in chain source files. This
makes them:
- Hard to review/iterate on without touching code
- Impossible to A/B test or version independently
- Not visible to non-developers
- Not reusable across chains (each chain reinvents similar instructions)

### The externalization problem

Steven has considered several approaches for prompt management:
- **LaunchDarkly** — feature flags for prompt variants, would enable A/B testing
- **Strapi** — headless CMS for prompt content, non-developer editing
- **Custom UI** — basic prompt management interface

At work: 100s of prompt context chunks in one Google Sheet, 100s of prompts
in another, no concept of prompt fragments. In verblets: prompt fragments
exist (constants.js) but are barely used.

### What "mature" prompt engineering might look like

No single solution — probably requires several approaches for different concerns:

**Fragment reuse.** The 32 unused fragments in constants.js aren't necessarily
bad — some may be aspirational patterns worth trying. Others (thinkStepByStep,
considerProsCons) are generic techniques that could improve many chains if
injected selectively. The question is: which chains would benefit from which
fragments, and how do you discover that?

**Prompt structure patterns.** Several chains independently arrived at the same
prompt structures:
- "System prompt setting role" + "User prompt with instructions" (scale, anonymize)
- "Explain your reasoning, then give the answer below a divider" (date, bool, number)
- "Apply this specification to evaluate each item" (score, entities, tags)

These are patterns worth naming and reusing, not just fragments.

**Temperature as a design choice.** Only 4 chains set temperature explicitly:
socratic (0.7 for creativity), split (0.1 for consistency), dismantle
(0.7/0.3 per stage), questions (1 for variety). Most chains use the default.
Is that intentional or neglected?

**response_format migration.** Several chains use prompt-level JSON instructions
(onlyJSON, onlyJSONStringArray) where `response_format` with a JSON schema
would be more reliable. See platform.md "Output Structuring" section.

**Prompt versioning.** If a prompt change improves one use case but degrades
another, how do you know? No mechanism exists for prompt regression testing
beyond the example tests.

### Open questions

- Should prompt fragments be organized by *intent* (steering, formatting,
  reasoning) or by *chain type* (collection operations, extraction, analysis)?
- Is the constants.js flat-export approach the right structure, or should
  fragments be grouped into objects by category?
- What would a minimal prompt management workflow look like that doesn't
  require a full CMS but goes beyond hardcoded strings?
- Could the unused Reflective/Analytical/Evidence-Based fragments be
  selectively injected by a "prompt quality" middleware?
