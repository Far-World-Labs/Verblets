# Guidelines

Standards and conventions enforced by architecture tests. Each file defines testable criteria for a specific aspect of the codebase.

## Code

- [code-quality.md](./code-quality.md) — Error handling, collection operations, file type expectations
- [prompts.md](./prompts.md) — Prompt engineering: structure, output requirements, clarity, reuse
- [json-schemas.md](./json-schemas.md) — Structured output schemas, `response_format` patterns, common mistakes

## Testing

- [unit-tests.md](./unit-tests.md) — Mocked LLM tests: coverage areas, mock realism, anti-patterns
- [example-tests.md](./example-tests.md) — Real LLM tests: `aiExpect`, budget tiers, compelling scenarios
- [architecture-tests.md](./architecture-tests.md) — AI-powered code analysis with `aiArchExpect`

## Documentation

- [documentation.md](./documentation.md) — README structure, prose style, anti-patterns, examples

## Related

- [DEVELOPING.md](../../DEVELOPING.md) — Contributor guide (config system, test commands, isomorphic design)
- [src/chains/DESIGN.md](../../src/chains/DESIGN.md) — Chain implementation patterns
- [src/verblets/DESIGN.md](../../src/verblets/DESIGN.md) — Verblet implementation patterns
- [docs/configuration.md](../docs/configuration.md) — Consumer-facing config guide
