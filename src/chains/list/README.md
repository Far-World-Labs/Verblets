# List Generation Chain

Generate contextual lists from natural language prompts using AI-powered content creation. This chain produces relevant, diverse items based on your specifications, with support for streaming generation and custom filtering.

## Use Cases

### Brainstorming Session
```javascript
import list from './src/chains/list/index.js';

// Generate ideas for a team building event
const activities = await list('Fun team building activities for a remote software team', {
  count: 8
});
// Result: [
//   "Virtual escape room challenge",
//   "Online cooking class together", 
//   "Digital scavenger hunt",
//   "Remote book club",
//   "Virtual game tournament",
//   "Online art workshop",
//   "Digital storytelling session",
//   "Virtual coffee chat rounds"
// ]
```

## Advanced Usage

### Streaming Generation
```javascript
import { generateList } from './src/chains/list/index.js';

// Generate items progressively for real-time display
const prompt = "Creative gift ideas for a tech-savvy teenager";

for await (const gift of generateList(prompt, { count: 15 })) {
  console.log(`New idea: ${gift}`);
  // Display each item as it's generated
  // "New idea: Programmable LED strip kit"
  // "New idea: Raspberry Pi starter bundle"
  // "New idea: Wireless mechanical keyboard"
  // ...
}
```

### Custom Control Logic
```javascript
import { generateList } from './src/chains/list/index.js';

const options = {
  shouldSkip: ({ result, resultsAll }) => {
    // Skip items that are too similar to existing ones
    return resultsAll.some(existing => 
      existing.toLowerCase().includes(result.toLowerCase().split(' ')[0])
    );
  },
  shouldStop: ({ queryCount, startTime }) => {
    // Stop after 3 queries or 30 seconds
    return queryCount > 3 || (Date.now() - startTime) > 30000;
  }
};

for await (const item of generateList("Unique startup ideas", options)) {
  console.log(item);
}
```

### Structured Output with Schema
```javascript
// Transform to structured objects with schema
const featureObjects = await list(`
  New features for a project management app
`, {
  count: 5,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
      effort: { type: 'string', enum: ['small', 'medium', 'large'] }
    },
    required: ['name', 'description', 'priority', 'effort']
  }
});
```

## API Reference

### `list(prompt, config)`

Generates a complete list of items based on the provided prompt.

**Parameters**

- `prompt` (string): Natural language description of what kind of list to generate
- `config` (object, optional): Configuration options
  - `count` (number): Target number of items to generate (default: 10)
  - `llm` (string|object): Model configuration (default: 'fastGoodCheap')
  - `schema` (object): JSON schema for transforming items to structured objects
  - Additional options passed to the underlying ChatGPT service

**Returns**

- `Promise<string[]>`: Array of generated list items
- If `schema` is provided, returns array of objects matching the schema

### `generateList(prompt, options)`

Generator function that yields items progressively as they're created.

**Parameters**

- `prompt` (string): Natural language description of the list to generate
- `options` (object, optional): Configuration options
  - `shouldSkip` (function): Custom logic to skip certain items
  - `shouldStop` (function): Custom logic to determine when to stop generating
  - `model` (string|object): Model configuration
  - Additional options for generation control

**Yields**

- `string`: Individual list items as they're generated

**Example with Custom Control**

```javascript
import { generateList } from './src/chains/list/index.js';

const options = {
  shouldSkip: ({ result, resultsAll }) => {
    // Skip items that are too similar to existing ones
    return resultsAll.some(existing => 
      existing.toLowerCase().includes(result.toLowerCase().split(' ')[0])
    );
  },
  shouldStop: ({ queryCount, startTime }) => {
    // Stop after 3 queries or 30 seconds
    return queryCount > 3 || (Date.now() - startTime) > 30000;
  }
};

for await (const item of generateList("Unique startup ideas", options)) {
  console.log(item);
}
``` 