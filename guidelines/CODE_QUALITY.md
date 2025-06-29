# Code Quality Guidelines

## Philosophy

Code quality in Verblets should prioritize clarity, maintainability, and practical error handling. We value pragmatic solutions over perfect adherence to abstract principles.

## File Type Classification

### Prompt Utilities (`src/prompts/`)
Simple functions that generate LLM prompts. These are **utility functions**, not configuration files.
- **Purpose**: Transform inputs into formatted prompt strings
- **Complexity**: Usually simple string templating with imports
- **Error Handling**: Required when dealing with external files or complex transformations
- **Documentation**: Function name and usage should be self-explanatory

### Library Utilities (`src/lib/`)
Reusable utility functions and modules.
- **Purpose**: Provide common functionality across the codebase
- **Error Handling**: Required for file operations, network calls, and data parsing
- **Documentation**: README required for complex modules

### Verblet Modules (`src/verblets/`)
LLM-aware functions that transform natural language into reliable outputs.
- **Purpose**: Handle specific LLM interaction patterns
- **Error Handling**: Required for LLM calls and data validation
- **Documentation**: README for complex verblets, simple ones can be self-explanatory

### Chain Modules (`src/chains/`)
Complex AI-powered workflows with batch processing and retry logic.
- **Purpose**: Orchestrate multi-step AI workflows
- **Error Handling**: Comprehensive error handling required
- **Documentation**: README always required

### Configuration Files
Actual configuration files like `.js` config files, not utility functions.
- **Purpose**: Configure tools, environments, or application settings
- **Error Handling**: Required for external dependencies and file operations
- **Documentation**: Comments for non-obvious choices

## File Types and Expectations

### Index Files (`src/index.js`)
- **Purpose**: Export aggregation and module entry points
- **Standards**: Clean imports/exports, logical grouping
- **Error Handling**: Not required for simple re-exports
- **Comments**: Optional, focus on grouping logic if complex

### Configuration Files (`src/prompts/`, `src/test/setup.js`)
- **Purpose**: Configuration and setup utilities
- **Standards**: Clear variable names, logical organization
- **Error Handling**: Required for external service connections
- **Comments**: Explain configuration choices and setup steps

## Error Handling Guidelines

### When Error Handling is Required
- **File operations** (reading, writing, parsing)
- **Network requests** and external API calls
- **LLM interactions** and response parsing
- **Data validation** for user inputs
- **Complex transformations** that can fail

### When Error Handling is Optional
- **Simple string templating** and formatting
- **Basic data structure manipulation**
- **Utility functions with predictable inputs**
- **Prompt generation** from known inputs

### Error Handling Patterns
```javascript
// For file operations
try {
  const data = await fs.readFile(path, 'utf8');
  return JSON.parse(data);
} catch (error) {
  throw new Error(`Failed to load config: ${error.message}`);
}

// For LLM calls
const result = await llm.call(prompt);
if (!result || result.error) {
  throw new Error('LLM call failed');
}

// For simple utilities - error handling often not needed
export default (text, instructions = '') => {
  return `Summarize: ${text} with ${instructions}`;
};
```