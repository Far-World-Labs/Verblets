# list-group-lines

Group a list of text lines into categorized collections using natural language instructions and optional predefined categories.

## Basic Usage

```javascript
import listGroupLines from './index.js';

const tasks = [
  'Review quarterly reports',
  'Update website content', 
  'Call client about project',
  'Fix database connection',
  'Schedule team meeting'
];

const grouped = await listGroupLines(
  tasks,
  'Group by work type',
  ['administrative', 'technical', 'communication']
);
// => {
//   administrative: ['Review quarterly reports', 'Schedule team meeting'],
//   technical: ['Update website content', 'Fix database connection'],
//   communication: ['Call client about project']
// }
```

## Parameters

- **list** (string[]): Array of text lines to group
- **instructions** (string): Natural language description of grouping criteria
- **categories** (string[], optional): Predefined category names for consistent grouping
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)

## Return Value

Returns an object where keys are category names and values are arrays of items belonging to each category.

## Features

- **Flexible categorization**: Use natural language to define grouping logic
- **Consistent categories**: Optional predefined categories ensure stable grouping across runs
- **Dynamic grouping**: When no categories provided, creates appropriate groups based on content

## Use Cases

- Organizing feedback or survey responses by theme
- Categorizing support tickets by type or priority
- Grouping content by topic or subject matter
- Classifying data for analysis or reporting
- Sorting items for workflow management

## Advanced Usage

```javascript
// Dynamic grouping without predefined categories
const comments = [
  'Love the new design!',
  'App crashes on startup',
  'Great customer support',
  'Login button not working'
];

const autoGrouped = await listGroupLines(
  comments,
  'Group by sentiment and issue type'
);
// Creates appropriate categories based on content
```
