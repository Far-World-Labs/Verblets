# intersections

Find comprehensive intersections between all combinations of items using AI-driven quality validation and example-based improvement.

For single intersection analysis, use the [list-intersect](../../verblets/list-intersect) verblet.

## Basic Usage

```javascript
import intersections from './index.js';

const groups = ['outdoor enthusiasts', 'food lovers', 'budget-conscious friends'];
const activities = await intersections(groups, {
  instructions: 'Return concrete weekend activities, not abstract themes'
});

// Returns structured object with all combinations:
// {
//   "outdoor enthusiasts + food lovers": {
//     combination: ["outdoor enthusiasts", "food lovers"],
//     description: "Activities combining outdoor adventure with culinary experiences",
//     elements: ["camping with gourmet cooking", "food truck festivals in parks", ...]
//   },
//   "outdoor enthusiasts + budget-conscious friends": { ... },
//   ...
// }
```

## Parameters

- **items** (Array): Items to find intersections between
- **options** (Object): Configuration options
  - **instructions** (string): Custom instructions for intersection finding
  - **minSize** (number): Minimum combination size (default: 1)
  - **maxSize** (number): Maximum combination size (default: items.length)
  - **batchSize** (number): Parallel processing batch size (default: 5)
  - **goodnessScore** (number): Quality threshold 1-10 (default: 7)

## Return Value

Returns an object where each key is a combination name and the value contains:
- `combination`: Array of items in this intersection
- `description`: Natural language explanation
- `elements`: Array of specific intersection examples

## Features

- **Quality-driven processing**: Uses AI scoring to identify high-quality examples
- **Example-based improvement**: Applies patterns from best results to all intersections
- **Batch processing**: Configurable parallel processing for efficiency
- **Built-in validation**: Ensures meaningful results or throws descriptive errors

## Use Cases

- Planning activities for diverse groups with different interests
- Product feature analysis across user segments
- Content categorization with overlapping themes
- Market research for multi-demographic targeting

## Error Handling

```javascript
try {
  const results = await intersections(['incompatible', 'items'], {
    goodnessScore: 9  // Very high threshold
  });
} catch (error) {
  // "No intersections found with score above 9. Consider lowering the goodnessScore threshold."
}