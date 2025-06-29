# Library Utilities

This directory contains low-level utility functions and services that provide foundational functionality for the Verblets library.

## Purpose

The `lib` directory houses:
- **Core utilities**: Basic functions for data transformation and validation
- **Service integrations**: Interfaces to external services like ChatGPT
- **Helper functions**: Common functionality used across verblets and chains

## Organization

- `chatgpt/` - OpenAI ChatGPT API integration
- `to-*` utilities - Data type conversion functions
- `assert/` - Custom assertion utilities
- `logger-service/` - Logging functionality
- `retry/` - Retry logic for operations
- `functional/` - Functional programming utilities

## Architecture

Library utilities should:
- Have no dependencies on verblets or chains
- Provide single-responsibility functions
- Be well-tested and documented


Modules include:

<!-- commonly used utilities -->
- [chatgpt](./chatgpt) – wrapper around OpenAI's ChatGPT API.
- [prompt-cache](./prompt-cache) – cache prompts/responses locally.
- [retry](./retry) – generic async retry helper.
- [search-best-first](./search-best-first) – best-first tree search algorithm.
- [search-js-files](./search-js-files) – locate and analyze JavaScript files.
- [combinations](./combinations) – generate array combinations.
- [rangeCombinations](./combinations) – combinations across multiple sizes.
- [shorten-text](./shorten-text) – shorten text using an LLM.
- [chunk-sentences](./chunk-sentences) – chunk text at sentence boundaries.
- [strip-numeric](./strip-numeric) – remove non-digit characters.
- [strip-response](./strip-response) – clean up model responses.
- [to-bool](./to-bool) – parse text into a boolean.
- [to-enum](./to-enum) – parse text into an enum value.
- [to-number](./to-number) – parse text into a number.
- [to-number-with-units](./to-number-with-units) – parse numbers that include units.
- [transcribe](./transcribe) – microphone transcription via Whisper.

These helpers are building blocks used throughout the rest of the project.
