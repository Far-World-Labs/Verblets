# Agents Guide

This document explains the internal architecture and development practices for the verblets project. It's intended for AI agents and developers working on the codebase.

## Architecture Overview

The verblets project has two main types of components:

### **Chains** (`src/chains/`)
LLM orchestrations that combine multiple verblets, other chains, and library utilities to perform complex workflows. Chains handle multi-step reasoning, batch processing, and sophisticated AI operations.

**Examples:**
- `anonymize` - Multi-step process to identify and replace sensitive information
- `socratic` - Iterative questioning dialogue using multiple LLM calls
- `bulk-map` - Parallel processing of large datasets with retry logic
- `summary-map` - Self-resizing hash table with AI-powered summarization

**Characteristics:**
- Use multiple LLM calls or orchestrate other modules
- Handle complex workflows and state management
- Often include retry logic and error handling
- May process data in chunks or batches

### **Verblets** (`src/verblets/`)
Single LLM calls with carefully crafted prompts and prompt-supporting functions. Each verblet performs one specific AI task with high reliability and constrained outputs.

**Examples:**
- `bool` - Extract true/false decisions from natural language
- `enum` - Map text to predefined options with high accuracy
- `intent` - Parse user intent and extract structured parameters
- `to-object` - Convert descriptions to structured JSON objects

**Characteristics:**
- Single LLM call per operation
- Substantial, optimized prompts with prompt variables
- Constrained outputs to prevent hallucination
- High reliability for specific tasks

### **Library Utilities** (`src/lib/`)
Supporting utilities that don't use LLMs directly. These provide infrastructure, data processing, and reusable functions that support both chains and verblets.

**Examples:**
- `chatgpt` - OpenAI API wrapper with error handling
- `prompt-cache` - Caching layer for LLM responses
- `retry` - Robust retry logic for async operations
- `parse-js-parts` - JavaScript AST parsing utilities
- `parse-llm-list` - Parse JSON arrays or CSV from LLM responses with filtering

**Characteristics:**
- No direct LLM usage
- Pure functions or utility classes
- Infrastructure and data processing
- Reusable across verblets and chains

## Module Structure

Every module (chain, verblet, or lib utility) follows a consistent structure:

```
module-name/
├── index.js          # Main implementation
├── index.spec.js     # Deterministic tests with mocks
├── index.examples.js # Non-deterministic tests with real LLM calls
└── README.md         # Documentation with compelling examples and docs for the JS API
```

### Required Files

#### `index.js`
The main implementation. Should export a default function or class.

#### `index.spec.js`
Deterministic tests using table-driven examples. These tests:
- Mock LLM interfaces (chatGPT, etc.)
- Use predictable inputs and expected outputs
- Run quickly and reliably in CI/CD
- Follow the `examples` array pattern

**Example:** See [`src/verblets/bool/index.spec.js`](src/verblets/bool/index.spec.js) for the table-driven testing pattern.

#### `index.examples.js`
Non-deterministic tests using real LLM calls. These tests:
- Use actual API calls (require API keys)
- Verify behavior with LLM assertion chains
- Use the `llm-expect` chain or verblet for intelligent assertions
- Include `longTestTimeout` for API call delays

**Example:** See [`src/verblets/bool/index.examples.js`](src/verblets/bool/index.examples.js) for LLM assertion usage.

#### `README.md`
Documentation with at least one compelling example that demonstrates how LLM programming changes what's possible. Should show real-world value and be accessible to developers.

**Example:** See [`src/chains/socratic/README.md`](src/chains/socratic/README.md) for compelling documentation.

## Testing Strategy

### Two-Tier Testing Approach

1. **Spec Tests** (`*.spec.js`)
   - Fast, deterministic, mocked
   - Table-driven with `examples` arrays
   - Run with `npm run test`
   - Essential for CI/CD and development

2. **Example Tests** (`*.examples.js`)
   - Slow, non-deterministic, real LLM calls
   - LLM assertions using `llm-expect` chain or verblet
   - Run with `npm run examples` (requires API keys--not possible as an agent)
   - Validate real-world behavior

### Testing Patterns

#### Table-Driven Examples
All tests use a consistent `examples` array structure. See [`src/verblets/enum/index.spec.js`](src/verblets/enum/index.spec.js) for the standard pattern.

#### LLM Assertion Chains
For example tests, use the `llm-expect` chain or verblet for assertions that blind assertions cannot handle:

**Chain Usage:** See [`src/chains/llm-expect/index.examples.js`](src/chains/llm-expect/index.examples.js) for enhanced LLM assertions.

**Verblet Usage:** See [`src/verblets/llm-expect/index.examples.js`](src/verblets/llm-expect/index.examples.js) for simple LLM assertions.

**Real-World Usage:** See [`src/chains/intersections/index.examples.js`](src/chains/intersections/index.examples.js) for LLM assertions in practice.

**Key Benefits of LLM Assertions:**
- Verify semantic meaning, not just structure
- Check content quality and appropriateness
- Validate business logic and context understanding
- Handle cases where traditional assertions are insufficient

## Development Commands

### Core Commands
- `npm run test` - Run deterministic spec tests
- `npm run lint` - Check code style
- `npm run lint:fix` - Auto-fix linting issues

### Example Commands (Require API Keys)
- `npm run examples` - Run non-deterministic example tests
- `npm run examples:warn` - Run examples with warning-level LLM expectations

**Note for Agents:** The `npm run examples` command won't work for AI agents since it requires API keys that agents don't have access to.

## Export Strategy

### Internal Organization
Internally, we maintain clear distinctions between chains, verblets, and lib utilities for architectural clarity and development organization.

### Public API
In the top-level README and `src/index.js`, we export everything as "verblets" to provide a unified, simple API for users. See [`src/index.js`](src/index.js) for the export structure.

This approach:
- Simplifies the user experience
- Maintains internal architectural clarity
- Allows for easy refactoring and organization
- Provides a consistent mental model for users

## Documentation Standards

### README Requirements
Every module README must include:

1. **Clear description** of what the module does
2. **At least one compelling example** showing real-world value
3. **Demonstration of LLM capabilities** that would be difficult/impossible with traditional programming
4. **Accessible code examples** that developers can immediately understand and use

### Example Quality
Examples should demonstrate transformative capabilities. See [`src/verblets/bool/README.md`](src/verblets/bool/README.md) and [`src/verblets/enum/README.md`](src/verblets/enum/README.md) for examples that show LLM understanding of context and nuance.

### Linking Strategy
- Most modules should be linked from the top-level README
- Organize by functional categories (primitives, lists, content, etc.)
- Prioritize modules that best demonstrate LLM capabilities
- Include brief descriptions that highlight unique value

## Development Environment

### .cursor Directory
The `.cursor` directory contains IDE-specific configuration and rules for the Cursor editor. This should include:
- Code style preferences
- AI assistant behavior guidelines
- Project-specific linting rules
- Development workflow configurations

**Note:** The `.cursor` directory should have comprehensive rules to guide development practices, though these may not be fully implemented yet.

## Best Practices

### For Chains
- Use clear step-by-step orchestration
- Include robust error handling and retry logic
- Document the workflow in comments
- Consider chunking for large datasets
- Provide progress feedback for long operations

### For Verblets
- Craft prompts carefully for reliability
- Constrain outputs to prevent hallucination
- Use JSON schemas for structured outputs
- Test edge cases thoroughly
- Optimize for single-call efficiency

### For Library Utilities
- Keep functions pure when possible
- Provide comprehensive error handling
- Include detailed JSDoc comments
- Design for reusability across modules
- Follow standard JavaScript patterns

### Testing Guidelines
- Write spec tests first (TDD approach)
- Mock all external dependencies in spec tests
- Use realistic but simple examples
- Make example tests robust with LLM assertions
- Include edge cases and error conditions
- Test both success and failure paths
- Use LLM assertions for content that traditional assertions cannot verify

This architecture enables building sophisticated AI-powered applications while maintaining code quality, testability, and developer experience. 
