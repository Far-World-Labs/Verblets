# Publishability Session: README-to-Code Analysis & Deterministic Automation
> 2026-02-19 (continuation session)

## What happened

Continued from the design session. Main work:

1. **Fixed 46 JSON imports** across 29 files for Node 22+ ESM compatibility. All 545 tests pass.

2. **Analyzed 14 chain READMEs against source code**. Found systematic issues:
   - Instruction builders all use `{ specification, processing }` — 4 READMEs had chain-specific names
   - Shared config (`llm`, `maxAttempts`, `onProgress`, `now`) was undocumented everywhere
   - 3 chains had critically wrong READMEs (disambiguate, split, score)
   - Phantom features documented that never existed
   - Hidden behaviors in code that weren't mentioned

3. **Fixed all 14 READMEs** and created shared config reference in `src/chains/README.md`.

4. **Built deterministic publishability checker** (`.workspace/scripts/check-publishability.mjs`).
   Uses parse-js-parts AST parsing + regex. No LLM needed. Catches:
   - Exports missing from READMEs
   - Config params not documented
   - Missing shared config references
   - Wrong instruction builder param names
   - Undocumented spec patterns

5. **Cataloged all 51 chains** by purpose and pattern.

## Key learnings

### "AI produces deterministic automation"
Steven's core insight: use AI to discover rules, then codify as deterministic checks.
The publishability analysis was AI-driven (Claude reading code + docs). The checker is
deterministic (AST parsing + string matching). The analysis produces the rules, the
checker enforces them cheaply.

### "Compositions are programs, not templates"
Steven pushed back on a rigid map→score→filter→sort pipeline I'd proposed. The right
composition depends on the problem. No fixed template.

### "Important details in the particular elements"
Steven redirected from surface-level quality checks (does the README have an example?)
to meaningful structural verification (does the README accurately describe the code?).

## Decisions made

- Added chain conventions to CLAUDE.md (shared config, batchSize naming, instruction builder params)
- Instruction builders uniformly use `{ specification, processing }`
- `batchSize` for LLM batching, `chunkSize` acceptable for chain-specific text chunking
- Chain READMEs reference `src/chains/README.md#shared-configuration` for common params

## What's next

- ~28 chains still need analysis and fixes
- The deterministic checker could grow more checks (return types, example validation)
- First real verblets composition exercise still hasn't happened
- Need to discuss: parallel refactors on non-'-1' worktree, public vs internal API boundary
