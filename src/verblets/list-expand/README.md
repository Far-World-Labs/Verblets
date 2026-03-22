# list-expand

Generate additional items that naturally extend a given list by inferring the pattern.

```javascript
import listExpand from '@anthropic/verblets/verblets/list-expand';

// The AI infers "wellness activities for seniors" from just two examples
const activities = ['gentle morning yoga', 'water aerobics'];
const expanded = await listExpand(activities, 6, {
  instructions: 'Activities suitable for a 65-year-old recovering from knee surgery',
});
// => ['gentle morning yoga', 'water aerobics', 'chair tai chi',
//     'resistance band exercises', 'swimming laps', 'guided meditation walks']
```

## API

### `listExpand(items, targetCount, config?)`

- **items** (string[]): Seed list to expand from
- **targetCount** (number): Desired total count including originals
- **config** (Object): Configuration options
  - **instructions** (string): Additional context to guide expansion
  - **llm**: LLM configuration

**Returns:** Promise\<string[]\> — Expanded array up to targetCount
