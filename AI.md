# Verblets Project AI Guide

## Core Design Philosophy

Chains and verblets are abstract by design - they can only be as accurate as their inputs. Since we cannot know the domain context in advance, accuracy depends on users providing sufficient context with their queries.

### Domain Context Handling
- Users should specify domain-specific context together with their question
- For questions requiring specialized knowledge, the context should be included in the main text input
- Consider adding a separate context parameter in future iterations
- The library provides the transformation mechanism; users provide the domain expertise

## Implementation Guidelines

### Prompt Management
- Reuse shared prompts from `src/prompts/index.js` for consistency
- Extract LLM response_format schemas to separate files (schema.js or schemas.js)
- Schema keys are part of the prompt interface - use descriptive names to guide output
- System prompts define the LLM's role and operation mode
- User prompts supply runtime details and variable content

### Model Considerations
- Be mindful of input size variability across different use cases
- Adapt prompt construction based on model context limitations
- Consider using smaller models for simple transformations
- Reserve larger models for complex reasoning tasks

## For Module Analysis

Consider these aspects when analyzing modules:

- Isomorphic compatibility - works in both browser and Node.js
- LLM prompt quality - well-structured and predictable prompts
- Composability - clean interfaces that work well with other modules
- Resource management - proper cleanup of connections, timeouts, listeners
- Prompt reuse - whether modules properly use shared prompts from src/prompts/index.js
- Schema extraction - whether response_format schemas are in separate files
- Model selection - appropriate model choice for task complexity
- Module-specific concerns - any unique aspects relevant to this particular module's functionality

## Non-Concerns for Analysis

When analyzing modules in this project, the following patterns are intentional and should NOT be flagged:

### Domain Knowledge
Lack of domain-specific knowledge in prompts is expected - this comes from the user's input, not the library. The library is intentionally abstract and general-purpose.

### Input Ambiguity  
Do not flag concerns about LLMs ambiguously interpreting user input. Assume the input is well-defined and unambiguous as part of the contract. Ambiguity concerns about the implementation's own prompts are valid if they exist and matter.

### Model Selection
Do not raise concerns about using smaller/weaker models unless a smaller model is explicitly specified in the code AND the weaker reasoning appears to be a design flaw. Often we intentionally use faster, cheaper models when the task is simple.

### Transformation Logic
When response_format is specified with a valid JSON schema, do not concern about transformation reliability - the schema ensures consistent output structure.

### Orchestration Patterns
Do not ask for orchestration features in verblets (fallbacks, redundant calls, chains for filtering/shaping). These belong in chains, not individual verblets.

### Analysis Approach
Only remark on concerns you actually see in the code - don't speculate about potential issues. Focus on actual implementation problems, not architectural patterns that are intentional.

### Skip Linter Territory
You're a highly skilled software engineer - don't comment on things a linter would catch:
- Unused variables, missing semicolons, inconsistent spacing
- Import order, naming conventions, quote styles
- Basic syntax issues or formatting problems
Your tools handle these. Focus on architectural and design concerns.

## Recommendation Guidelines

### Never Suggest
- Model training or fine-tuning (too complex for this project)
- Vague improvements like "add more tests" or "improve error handling"
- Architectural changes that go against the project philosophy

### Test Recommendations
When suggesting tests, be SPECIFIC:
- Name exact test cases missing (e.g., "test with empty string input")
- Identify specific boundaries not tested (e.g., "maximum array size of 1000")
- Point to specific branches not covered with line numbers (e.g., "error path at line 45")

### Focus Areas
- Resource leaks - Unclosed connections, uncleared timeouts, memory leaks
- Missing JSON schemas - LLM calls without proper response_format specifications
- Prompt quality issues - Malformed prompts, missing context, unclear instructions
- Schema mismatches - Discrepancies between expected and actual response formats
- Isomorphic compatibility - Code that won't work in browser or Node.js environments
- Mock response realism - Tests using unrealistic mock data instead of actual LLM patterns
- Collection operation patterns - Improper handling of .items wrapper in chains
- Error propagation - Swallowing errors that should bubble up to orchestrators
- Batch processing efficiency - Missing opportunities for parallel or bulk operations
- Integration contracts - Broken assumptions between modules and their consumers