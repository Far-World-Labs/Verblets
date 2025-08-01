# test

Analyze code files against custom test criteria using AI-powered inspection. Returns specific, actionable feedback about issues found.

## Usage

```javascript
const securityIssues = await test(
  './src/api/userAuth.js', 
  'check for common security vulnerabilities like SQL injection, XSS, exposed secrets, or missing input validation'
);
// Returns: [
//   "Line 23: SQL query uses string concatenation. Use parameterized queries to prevent SQL injection.",
//   "Line 45: User input directly rendered to HTML. Sanitize with DOMPurify to prevent XSS.",
//   "Line 78: API key hardcoded in source. Move to environment variable."
// ]

// Or empty array if no issues found
const cleanCode = await test('./src/utils/helpers.js', 'check for code smells and anti-patterns');
// Returns: []
```

## API

### `test(path, instructions)`

**Parameters:**
- `path` (string): File path to analyze
- `instructions` (string): Natural language description of what to test for

**Returns:** Promise<Array<string>> - Array of issue descriptions with actionable feedback, or empty array if no issues found

## Features

- **Focused analysis**: Only reports issues related to your specific test criteria
- **Actionable feedback**: Provides specific line numbers and concrete fix suggestions
- **Error handling**: Gracefully handles file read errors
- **Efficient processing**: Uses fast model for quick analysis

## Output Format

Each issue in the returned array includes:
- Description of the problem
- Specific location (line numbers when possible)
- Suggested fix or improvement
- Context about why it matters