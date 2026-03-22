/**
 * audit-prompts.mjs — LLM prompt templates for maturity audit phases
 *
 * Separated from logic so evaluation code is scannable.
 * Each export is either a constant (no dynamic parts) or a function
 * that takes the dynamic values and returns the prompt string.
 */

// ============================================================
// Phase 3: Design fitness evaluation
// ============================================================

export const designEvalPrompt = (dimensionList) => `You are evaluating a verblets chain module's DESIGN FITNESS — whether its
design is right for the problem it solves, not whether the implementation
follows coding best practices.

DIMENSIONS TO EVALUATE: ${dimensionList}

This library is a collection of AI-powered functions that transform data using
LLM calls. The core composition model uses:
- Batch processing chains (map, filter, reduce, group, sort, find) as orchestrators
- Spec/apply pattern: a chain generates a specification, then applies it across items
- Instruction builders: functions that produce prompts for use with collection chains
- Natural language instructions as the primary interface

For each dimension, evaluate the chain's design maturity based on the rubric.

Provide per dimension:
- level: integer 0-4 matching the rubric's level definitions
- evidence: specific observations justifying the level
- gap: what design change would improve this (empty string if level 4)
- nextAction: one concrete design action (empty string if level 4)

EVALUATION GUIDANCE:
- For strategic-value: Think as a developer building AI features. How often would
  you reach for this tool? Does it enable workflows that were previously impossible?
- For architectural-fitness: Compare lines of code to idea complexity. Is this a
  simple idea buried in complex code? Could the problem be decomposed differently?
- For generalizability: Check for hard dependencies on specific frameworks, runtimes,
  or data formats. Could the core capability serve more contexts?
- For composition-fit: Does this chain build on the library's own primitives (map,
  filter, reduce, score), or does it reimplement batch processing/scoring/filtering?
  Could it be expressed as a composition of existing chains?
- For design-efficiency: Is the LOC proportional to genuine problem complexity?
  Count helper functions — many small helpers may indicate the main abstraction is wrong.

RULES:
- Judge the DESIGN, not the code quality. Clean code with a wrong design still scores low.
- A chain that reimplements what other library chains already do scores low on composition-fit.
- A powerful idea with a strained implementation scores HIGH on strategic-value but LOW on design-efficiency.
- Evidence must cite specific observations: LOC count, import patterns, architecture decisions.
- Use the PORTFOLIO CONTEXT to judge whether this chain overlaps with or complements others.

Return valid JSON:
{
  "dimensions": {
    "dimension-name": {
      "level": 0,
      "evidence": "specific observation here",
      "gap": "design change needed",
      "nextAction": "concrete action"
    }
  }
}`;

// ============================================================
// Phase 4: Code dimension evaluation
// ============================================================

export const codeEvalPrompt = (dimensionList) => `You are evaluating a verblets chain module against maturity rubrics.

DIMENSIONS TO EVALUATE: ${dimensionList}

For each dimension, determine the chain's maturity level based on the rubric.

Provide per dimension:
- level: integer 0-4 matching the rubric's level definitions
- evidence: specific code references (function names, imports, patterns) justifying the level
- gap: what's missing to reach the next level (empty string if level 4)
- nextAction: one concrete action to improve (empty string if level 4)

EVALUATION METHOD — follow this order:
1. CHECK IMPORTS FIRST: The IMPORTS line lists what the chain actually uses.
   If it imports lib/lifecycle-logger, it HAS lifecycle logging capability.
   If it imports lib/progress-callback, it HAS event emission capability.
   The import list is ground truth — do not contradict it.
2. FIND USAGE: Search the source code for how the imported modules are used.
   Name the specific functions called (e.g., createLifecycleLogger, logStart,
   emitBatchStart, createBatches).
3. MATCH TO RUBRIC: Compare the import + usage evidence against the rubric's
   level definitions. Pick the highest level whose criteria are fully met.

RULES:
- The level MUST NOT exceed the deterministic ceiling for that dimension
- Evidence MUST cite specific code: import names, function calls, variable patterns
- If the chain has no relevant code for a dimension, level is 0
- Use the rubric's Observations section for project-specific context
- Do NOT give generic praise — every claim must be traceable to source code

EVIDENCE FORMAT — your evidence string MUST contain at least one of:
- A backtick-quoted identifier: \`functionName\`, \`variableName\`, \`lib/module-name\`
- A camelCase function or variable name: createBatches, logStart, emitBatchProcessed
- A function call: retry(), createLifecycleLogger()
- A file reference: index.spec.js, README.md
BAD evidence: "Clean separation of concerns" (names nothing specific)
GOOD evidence: "Uses \`createLifecycleLogger\` for structured logging, calls \`logStart\` and \`logResult\`"

Return valid JSON:
{
  "dimensions": {
    "dimension-name": {
      "level": 0,
      "evidence": "specific code reference here",
      "gap": "what is missing",
      "nextAction": "concrete improvement"
    }
  }
}`;

// ============================================================
// Phase 5: Interface dimension evaluation
// ============================================================

export const interfaceEvalPrompt = (dimensionList) => `You are evaluating a verblets chain module against maturity rubrics.

DIMENSIONS TO EVALUATE: ${dimensionList}

For each dimension, determine the chain's maturity level based on the rubric.

Provide per dimension:
- level: integer 0-4 matching the rubric's level definitions
- evidence: specific references (export names, README sections, test file patterns)
- gap: what's missing to reach the next level (empty string if level 4)
- nextAction: one concrete action to improve (empty string if level 4)

RULES:
- The level MUST NOT exceed the deterministic ceiling for that dimension
- For documentation: compare README content against actual exports and config params
- For api-surface: evaluate export naming, spec patterns, instruction builders
- For composability: check for spec/apply split, instruction builders, factory functions
- For testing: consider spec tests, example tests, aiExpect coverage
- Evidence MUST cite specific artifacts, not generic descriptions

EVIDENCE FORMAT — your evidence string MUST name specific things:
- For api-surface: name the actual exports (e.g., "Exports \`mapOnce\`, \`mapInstructions\`, default \`map\`")
- For documentation: name README sections found (e.g., "README has API section listing \`map(items, instruction, config)\`")
- For composability: name the spec/apply functions (e.g., "Exports \`scoreSpec()\` and \`applyScore()\` split")
- For testing: name test files and patterns (e.g., "Has \`index.spec.js\` with unit tests and \`index.examples.js\` using \`aiExpect\`")
BAD evidence: "Exports documented, shared config destructuring present" (names nothing)
GOOD evidence: "Exports \`filterOnce\` and default \`filter\`, accepts shared config params \`llm\`, \`maxAttempts\`, \`onProgress\`"

Return valid JSON:
{
  "dimensions": {
    "dimension-name": {
      "level": 0,
      "evidence": "specific reference here",
      "gap": "what is missing",
      "nextAction": "concrete improvement"
    }
  }
}`;

// ============================================================
// Phase 6: Prompt engineering evaluation
// ============================================================

export const PROMPT_EVAL_PROMPT = `You are evaluating a verblets chain module's prompt engineering maturity.

Evaluate the chain against the prompt-engineering rubric.

Provide:
- level: integer 0-4 matching the rubric level definitions
- evidence: specific prompt patterns (template literals, prompt constants used,
  system prompts, temperature settings, response_format usage)
- gap: what's missing to reach the next level (empty string if level 4)
- nextAction: one concrete action to improve (empty string if level 4)

RULES:
- Evidence MUST cite specific prompt patterns from the source code
- Note which promptConstants are used (if any) by name
- Note temperature, system prompt, response_format usage
- Consider both the chain's own prompts and its use of shared prompt utilities
- Level 0 = raw string concatenation with no shared utilities
- Level 1 = uses asXML for variable wrapping

Return valid JSON:
{
  "level": 0,
  "evidence": "specific prompt patterns here",
  "gap": "what is missing",
  "nextAction": "concrete improvement"
}`;

// ============================================================
// Phase 7: Self-assessment quality filter
// ============================================================

export const SELF_ASSESS_FILTER_PROMPT = `Review each finding for quality. KEEP the finding UNLESS it has a clear, serious problem.

ALWAYS KEEP findings at Level 0 — these indicate absence of a capability, which is valid and useful.

REJECT only if:
- Evidence is completely generic with NO specifics at all (e.g., "well-structured code")
- Evidence directly contradicts the assigned level (claims level 3 but describes level 1 behavior)
- Evidence is just a restatement of the rubric definition with no chain-specific detail

KEEP if the evidence:
- Names any specific function, import, module, pattern, or file
- References a specific architectural pattern (spec/apply, instruction builders, batch processing)
- Describes a concrete behavior observed in the chain's code
- Mentions specific configuration parameters, exports, or library usage
- States absence of a feature (Level 0 findings)

When in doubt, KEEP. The deterministic validation has already filtered out structurally invalid findings.`;

// ============================================================
// Phase 8: Scorecard synthesis
// ============================================================

export const scorecardSynthesisPrompt = (runTimestamp) => `Build a maturity audit synthesis. For each piece of data, integrate it
into the accumulator. [Run: ${runTimestamp}]

The audit has two tiers:
- Tier 1 (Design Fitness): strategic-value, architectural-fitness, generalizability,
  composition-fit, design-efficiency. These assess whether the design is RIGHT.
- Tier 2 (Implementation Quality): logging, events, testing, etc. These assess
  whether a good design is well-implemented.

The report should cover:

1. DESIGN ASSESSMENT: Which chains have strong/weak design fitness? Which need
   redesign before implementation hardening?
2. IMPLEMENTATION PATTERNS: For chains with sound designs, what cross-cutting
   implementation gaps exist?
3. PRIORITY ORDERING: Design fixes should come before implementation hardening.
   Flag chains where Tier 2 work should be deferred.
4. TOP 5 IMPROVEMENTS: Specific, actionable, ranked by impact. Design fixes first.

Be specific. Name chains and dimensions. Cite evidence from the findings.`;

// ============================================================
// Phase 8: Strategic assessment
// ============================================================

export const strategicAssessmentPrompt = (runTimestamp) => `You are conducting a strategic maturity assessment of the verblets AI library —
a collection of AI-powered functions that transform data using LLM calls.
[Audit run: ${runTimestamp}]

The scorecard data has TWO TIERS of evaluation:
- DESIGN scores (strategic-value, architectural-fitness, generalizability,
  composition-fit, design-efficiency) tell you whether the module's DESIGN is right
- IMPL scores (logging, events, testing, etc.) tell you whether the IMPLEMENTATION is solid

A module with low design scores needs REDESIGN, not implementation polish.

Build a strategic assessment covering:

1. DESIGN FITNESS REVIEW
   - Which chains have strong designs? These are candidates for implementation hardening.
   - Which chains have strained designs? What would redesign look like?
   - Are there powerful ideas (high strategic-value) trapped in poor architectures
     (low architectural-fitness or design-efficiency)?

2. PORTFOLIO ANALYSIS
   - Are the right things being built? Which modules should exist, which shouldn't?
   - Which modules overlap or could be consolidated?
   - Are there modules that should be split, restructured, or generalized?

3. COMPOSITION MODEL
   - Is the spec/apply + instruction builder pattern the right composition model?
   - Which chains participate well, which are isolated monoliths?
   - Where could existing chain-of-chains be expressed as compositions of primitives?

4. STRATEGIC RECOMMENDATIONS
   - Top 5 changes ranked by impact. Design fixes BEFORE implementation hardening.
   - Which chains should be redesigned vs. hardened vs. left alone?
   - Quick wins (design simplifications) vs. longer-term investments (new capabilities)

GROUNDING RULES — you MUST follow these:
- ONLY make claims about modules that have SCORECARD FINDINGS data
- Do NOT invent specific numbers unless they appear in the provided data
- Every claim must trace back to scorecard findings, gaps, or strategic context
- The library ALREADY uses response_format with JSON schemas for structured output
- Prefer concrete suggestions over abstract ones
- When the strategic context poses QUESTIONS, address them as questions — don't restate
  them as assertions or invent answers not supported by the data`;
