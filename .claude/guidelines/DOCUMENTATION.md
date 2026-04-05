# Documentation Guidelines

## Document Types

**Module READMEs** help developers understand and use individual modules. **Parent-level READMEs** (chains/, verblets/, lib/) explain the category and help choose between modules. **Guidelines** define standards for architecture tests and code quality. **DESIGN.md files** document architectural decisions and design patterns.

## Module README Structure

1. **Title** — the module's kebab-case directory name
2. **Opening paragraph** — one or two sentences on what the module does and when to use it. Cross-reference related modules here if relevant.
3. **Code example** — a realistic scenario showing the primary use case, using the package import path (`import { name } from '@far-world-labs/verblets'`)
4. **API section** — parameters, return values, configuration options. Use flat dot notation for config sub-properties (`config.batchSize`) rather than nested indentation.
5. **Features** (optional) — only for genuinely non-obvious capabilities. Standard chain behaviors (batching, retries, parallel processing) do not warrant a Features section.

### Quality standards

Lead with what makes the module distinctive. Show natural language parameters — these are the unique power of verblets. Examples should demonstrate AI capabilities that would be difficult with traditional code, using realistic inputs (a real paragraph, a plausible dataset) rather than placeholder text.

Use defaults in examples. Don't complicate the first example with bulk processing configuration or model selection unless that's the module's primary purpose. List non-functional benefits (parallel processing, batching) after core capabilities.

Generic model configuration (temperature, maxTokens, llm selection) belongs in [docs/configuration.md](../docs/configuration.md), not in individual module READMEs. Include an "Advanced Usage" section only when the module has genuinely specialized configuration beyond standard model options.

Cross-cutting subsystems have their own centralized documentation in `docs/`. Module READMEs should reference these rather than re-explaining common behaviors:

- [Configuration](../docs/configuration.md) — model selection, capabilities, model parameters
- [Option Resolution](../docs/option-resolution.md) — `nameStep`, `track`, `getOptions`, `getOption`, `withPolicy`, mappers, policy
- [Batching](../docs/batching.md) — auto-sizing, `parallelBatch`, `prepareBatches`, `batchSize`/`maxParallel`
- [Progress Tracking](../docs/progress-tracking.md) — `onProgress`, `scopeProgress`, `trackBatch`, event lifecycle
- [Retry](../docs/retry.md) — config-aware retries, retryable errors, abort signal
- [JSON Schemas](JSON_SCHEMAS.md) — `response_format`, schema design, auto-unwrapping

### Common mistakes

Verbose introductions that restate what the title already says. Boring examples using trivial string operations. Bullet-point use cases without code. Multiple similar examples that are minor variations of the same scenario. Separate "Examples" sections instead of integrating examples into the API or use case documentation. Generic feature lists that apply to every chain.

## Parent-Level READMEs

These should explain what the category is, provide selection guidance (when to use which module), and link to individual modules with brief descriptions. Link to the corresponding DESIGN.md for shared principles.

## Guidelines Files

Guidelines are consumed by both humans and architecture tests. Each rule should be specific and testable, with examples of correct and incorrect implementations. Include rationale when the reasoning isn't obvious.

## Writing Standards

Write for developers who scan before reading. Lead with the most important information. Use concrete examples over abstract descriptions. Every sentence should add unique value — combine redundant information rather than repeating it. Link to shared concepts rather than explaining them in multiple places.

Structure by user priority, not internal logic. Terminology should be consistent across all documentation files.

## Maintenance

Review documentation when changing module APIs. Update cross-references when adding or removing modules. When multiple files cover similar topics, consolidate into one canonical location and cross-reference from the others.

## Reference Examples

The [set-interval](../src/chains/set-interval/) README demonstrates adaptive behavior through natural language programming. The root README shows a longer orchestration workflow.
