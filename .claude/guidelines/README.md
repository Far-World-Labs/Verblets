# Guidelines

Standards and conventions enforced by architecture tests. Each file defines testable criteria for a specific aspect of the codebase.

## Code

- [CODE_QUALITY.md](./CODE_QUALITY.md) — Error handling, collection operations, file type expectations
- [PROMPTS.md](./PROMPTS.md) — Prompt engineering: structure, output requirements, clarity, reuse
- [JSON_SCHEMAS.md](./JSON_SCHEMAS.md) — Structured output schemas, `response_format` patterns, common mistakes

## Testing

- [UNIT_TESTS.md](./UNIT_TESTS.md) — Mocked LLM tests: coverage areas, mock realism, anti-patterns
- [EXAMPLE_TESTS.md](./EXAMPLE_TESTS.md) — Real LLM tests: `aiExpect`, budget tiers, compelling scenarios
- [ARCHITECTURE_TESTS.md](./ARCHITECTURE_TESTS.md) — AI-powered code analysis with `aiArchExpect`

## Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md) — README structure, prose style, anti-patterns, examples

## Related

- [DEVELOPING.md](../DEVELOPING.md) — Contributor guide (config system, test commands, isomorphic design)
- [src/chains/DESIGN.md](../src/chains/DESIGN.md) — Chain implementation patterns
- [src/verblets/DESIGN.md](../src/verblets/DESIGN.md) — Verblet implementation patterns
- [docs/configuration.md](../docs/configuration.md) — Consumer-facing config guide
