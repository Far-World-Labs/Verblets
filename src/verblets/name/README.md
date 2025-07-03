# name

Generate concise, descriptive names for text content or concepts using natural language understanding.

## Basic Usage

```javascript
import name from './index.js';

const projectDescription = `
  A mobile app that helps users track their daily water intake 
  with gentle reminders and progress visualization
`;

const projectName = await name(projectDescription);
// => "Hydration Tracker" (example)
```

## Parameters

- **text** (string): The content or concept to generate a name for
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)
  - **context** (string): Additional context to guide naming (optional)

## Return Value

Returns a string containing the generated name.

## Use Cases

- Creating titles for articles, projects, or documents
- Naming features or product concepts
- Generating labels for categorized content
- Creating evocative titles that capture essence beyond keywords

## Advanced Usage

```javascript
// With context for more targeted naming
const featureName = await name(
  'Users can save their favorite coffee shop locations and get notified when nearby',
  { context: 'mobile app feature for coffee enthusiasts' }
);
// => "Café Locator" (example)
```
