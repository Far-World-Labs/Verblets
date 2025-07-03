# list-expand

Generate additional items that naturally extend a given list using pattern recognition and contextual understanding.

## Basic Usage

```javascript
import listExpand from './index.js';

// Expand a list of programming languages
const languages = ['JavaScript', 'Python'];
const expanded = await listExpand(languages, 5);
// => ['JavaScript', 'Python', 'Java', 'C++', 'Ruby']
```

## Parameters

- **items** (string[]): Initial list of items to expand from
- **targetCount** (number): Total number of items desired in the final list
- **config** (Object): Configuration options
  - **llm** (Object): LLM model options (default: uses system default)
  - **instructions** (string): Custom instructions for expansion (optional)

## Return Value

Returns an array containing the original items plus additional items that fit the same pattern or category, up to the target count.

## Use Cases

- Brainstorming and idea generation
- Creating comprehensive lists from partial examples
- Expanding seed data for testing or prototyping
- Generating variations on a theme
- Building complete datasets from sample items

## Advanced Usage

```javascript
// Expand with custom instructions
const hobbies = ['reading', 'hiking'];
const expanded = await listExpand(
  hobbies, 
  6, 
  { instructions: 'Focus on indoor and outdoor activities that promote wellness' }
);
// => ['reading', 'hiking', 'yoga', 'gardening', 'meditation', 'cycling']

// Expand business concepts
const strategies = ['content marketing', 'social media advertising'];
const moreStrategies = await listExpand(strategies, 7);
// => ['content marketing', 'social media advertising', 'email campaigns', 
//     'SEO optimization', 'influencer partnerships', 'webinars', 'affiliate programs']
```

## Pattern Recognition

The function analyzes the provided items to understand:
- Category or domain (colors, foods, technologies, etc.)
- Style or format (formal/informal, technical/simple)
- Scope and specificity level
- Relationships between existing items

```javascript
import listExpand from './index.js';

await listExpand(['red', 'green'], 5);
// => ['red', 'green', 'blue', 'yellow', 'purple']
```
