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

### Core API Integration
- [chatgpt](./chatgpt) – wrapper around OpenAI's ChatGPT API

### Data Processing & Conversion
- [chunk-sentences](./chunk-sentences) – chunk text at sentence boundaries
- [combinations](./combinations) – generate array combinations and permutations
- [parse-llm-list](./parse-llm-list) – parse LLM-generated lists from various formats
- [parse-js-parts](./parse-js-parts) – parse JavaScript code components
- [shorten-text](./shorten-text) – intelligently shorten text using an LLM
- [strip-numeric](./strip-numeric) – remove non-digit characters from strings
- [strip-response](./strip-response) – clean up and normalize model responses
- [template-replace](./template-replace) – string template replacement utilities
- [text-batch](./text-batch) – batch text processing operations
- [text-similarity](./text-similarity) – calculate semantic text similarity

### Type Conversion Utilities
- [to-bool](./to-bool) – parse text into boolean values
- [to-date](./to-date) – parse text into date objects
- [to-enum](./to-enum) – parse text into enum values
- [to-number](./to-number) – parse text into numbers
- [to-number-with-units](./to-number-with-units) – parse numbers with their units

### Search & File Operations
- [search-best-first](./search-best-first) – best-first tree search algorithm
- [search-js-files](./search-js-files) – locate and analyze JavaScript files
- [each-dir](./each-dir) – iterate through directories
- [each-file](./each-file) – iterate through files
- [path-aliases](./path-aliases) – manage path aliases and mappings

### System & Infrastructure
- [any-signal](./any-signal) – signal handling utilities
- [assert](./assert) – custom assertion utilities for validation
- [code-extractor](./code-extractor) – extract code from various formats
- [crypto](./crypto) – cryptographic utilities
- [debug](./debug) – debugging utilities
- [dependency-cruiser](./dependency-cruiser) – analyze module dependencies
- [editor](./editor) – text editor integration utilities
- [env](./env) – environment variable management
- [functional](./functional) – functional programming utilities
- [log-adapter](./log-adapter) – logging adapter interface
- [logger](./logger) – core logging functionality
- [logger-service](./logger-service) – logging service implementation
- [pave](./pave) – object path utilities
- [prompt-cache](./prompt-cache) – cache prompts and responses locally
- [retry](./retry) – generic async retry helper with exponential backoff
- [ring-buffer](./ring-buffer) – circular buffer implementation
- [ring-buffer-redis](./ring-buffer-redis) – Redis-backed circular buffer
- [ring-buffer-shared](./ring-buffer-shared) – shared circular buffer utilities
- [shuffle](./shuffle) – array shuffling utilities
- [timed-abort-controller](./timed-abort-controller) – time-limited operation control
- [transcribe](./transcribe) – microphone transcription via Whisper API
- [window-for](./window-for) – time window utilities
- [with-inactivity-timeout](./with-inactivity-timeout) – timeout inactive operations

These helpers are building blocks used throughout the rest of the project.
