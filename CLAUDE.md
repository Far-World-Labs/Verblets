# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## Project: Verblets AI Library

AI-powered functions that accept natural language instructions to transform and process data.

### Project-Specific Rules
- **Never use null** - Convert to undefined at boundaries (JSON, Redis, chatGPT responses)
- **Use response_format with JSON schemas** - The chatGPT module auto-unwraps `value` and `items`
- **Example tests MUST use vitest core function wrappers** - For AI analysis of test output
- **One compelling example per README** - Show unique AI capabilities with real-world scenarios

### Code Style Preferences
- **Avoid early returns** - Less nesting, clearer flow
- **Define named variables** - Make transformations explicit
- **Extract pure functions** - Even from classes when possible
- **Composable interfaces** - Design for composition
- **Use lib/ for reusable modules** - Break out generally useful code
- **Boy Scout Principle** - Always leave code cleaner than you found it
- **Extract magic numbers** - To constants file (global), module constants, or file-level
- **Config hierarchy** - Environment variables → startup parsing → config values

## Important Context for Analysis

When analyzing modules in this project, remember:
1. **LLM dependency is not a concern** - It's the fundamental design of verblets
2. **Error handling philosophy** - Verblets should crash in ways that orchestrators can recover from or retry
3. **Single LLM call rule** - Verblets should use exactly one LLM call without async forks
4. **No retry logic in verblets** - This belongs in chains, not individual functions
5. **Chains are orchestrators** - They handle retries, error recovery, and complex workflows
6. **Isomorphic design** - All modules should work in both browser and Node.js environments
7. **Environment adaptation** - Modules that can't be isomorphic should be disabled from bundling/install or adapt to their host environment

## Philosophy

### Error Handling
- **Fail fast** for critical configuration (missing text model)
- **Log and continue** for optional features (extraction model)
- **Graceful degradation** when external services unavailable
- **User-friendly messages** through resilience layer
- **Recoverable crashes** - Verblets should fail in ways orchestrators can handle

### Isomorphic Requirements
- All modules must work in browser and Node.js
- Use environment detection to adapt behavior when needed
- Disable non-portable modules from bundling when necessary
- Prefer universal APIs over platform-specific ones

## Tone and Behavior
- Criticism is welcome. Please tell me when I am wrong or mistaken, or even when you think I might be wrong or mistaken
- Please tell me if there is a better approach than the one I am taking
- Please tell me if there is a relevant standard or convention that I appear to be unaware of
- Be skeptical
- Be concise
- Short summaries are OK, but don't give an extended breakdown unless we are working through the details of a plan
- Do not flatter, and do not give compliments unless I am specifically asking for your judgement
- Occasional pleasantries are fine
- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask

## ABSOLUTE RULES:
- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants. Read files before writing new functions. Use common sense function name to find them easily
- NO DEAD CODE : either use or delete from codebase completely
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debugging
- NO INCONSISTENT NAMING - read existing codebase naming patterns
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles