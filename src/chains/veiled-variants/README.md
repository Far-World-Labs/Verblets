# veiled-variants

Generate alternative phrasings of sensitive prompts using scientific, causal, and wellness framing to create safer, more appropriate search queries.

## Basic Usage

```javascript
import veiledVariants from './index.js';

// Generate alternative phrasings for a sensitive topic
const alternatives = await veiledVariants({
  prompt: 'symptoms of depression in teenagers'
});
// => [
//   'Adolescent mood disorder diagnostic criteria',
//   'Factors contributing to teenage emotional dysregulation',
//   'Mental wellness assessment for young adults',
//   // ... more alternatives
// ]
```

## Parameters

- **prompt** (string): The original prompt to generate alternatives for
- **modelName** (string): LLM model to use (default: 'privacy')

## Return Value

Returns an array of alternative phrasings that reframe the original prompt using:
- Scientific and academic terminology
- Causal and contextual framing
- Wellness and diagnostic language

## Framing Strategies

### Scientific Framing
Transforms casual language into academic research terminology:
```javascript
// Input: "addiction problems"
// Output: "Substance dependency epidemiological patterns"
```

### Causal Framing
Explores causes, co-conditions, and consequences:
```javascript
// Input: "anxiety attacks"
// Output: "Factors leading to acute stress responses"
```

### Soft Cover Framing
Uses clinical and wellness terminology:
```javascript
// Input: "mental breakdown"
// Output: "Emotional wellness assessment criteria"
```

## Use Cases

- **Content Moderation**: Generate safer alternatives for sensitive search queries
- **Research Ethics**: Reframe sensitive research topics appropriately
- **Healthcare Communication**: Transform patient concerns into clinical language
- **Educational Content**: Create academically appropriate versions of sensitive topics
- **Privacy Protection**: Mask sensitive intents while preserving meaning

## Advanced Usage

```javascript
// Process multiple sensitive topics
const topics = [
  'eating disorder symptoms',
  'substance abuse warning signs',
  'domestic violence indicators'
];

const allAlternatives = await Promise.all(
  topics.map(topic => veiledVariants({ prompt: topic }))
);
``` 