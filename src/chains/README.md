# Chains

Chains are complex, multi-step workflows that combine multiple verblets and utilities to perform sophisticated operations.

## What are Chains?

Chains orchestrate multiple operations to:
- Process data through multiple stages
- Handle complex business logic
- Manage state and context across operations
- Provide high-level abstractions for common workflows

## Key Features

- **Multi-step Processing**: Execute multiple operations in sequence
- **Context Management**: Maintain state across processing steps
- **Error Handling**: Robust error management and recovery
- **Composability**: Chains can be combined with other chains and verblets

## Usage

Chains are used for complex operations that require multiple steps or sophisticated logic that goes beyond what individual verblets can provide.

## Model Configuration

All chains support standard model configuration options:

```javascript
const result = await chainName(input, instructions, {
  llm: {
    modelName: 'gpt-4',           // Specific model selection
    temperature: 0.7,             // Response randomness (0.0-1.0)
    maxTokens: 1000,              // Maximum response length
    topP: 0.9,                    // Nucleus sampling parameter
    frequencyPenalty: 0.0,        // Reduce repetition
    presencePenalty: 0.0          // Encourage topic diversity
  },
  // Chain-specific configuration options vary by chain
  maxAttempts: 3,                 // Common retry configuration
  timeout: 30000                  // Common timeout configuration
});
```

### Model Selection Strategies

```javascript
// Privacy-first for sensitive data
{ llm: { modelName: 'privacy' } }

// Optimized for bulk operations
{ llm: { negotiate: { fast: true, cheap: true } } }

// Quality-critical operations
{ llm: { negotiate: { good: true } } }

// Complex reasoning tasks
{ llm: { negotiate: { reasoning: true } } }

// Default balanced approach
{ llm: { modelName: 'fastGoodCheap' } }
```

Available chains:

- [ai-arch-expect](./ai-arch-expect)
- [anonymize](./anonymize)
- [category-samples](./category-samples)
- [central-tendency](./central-tendency)
- [collect-terms](./collect-terms)
- [conversation](./conversation)
- [conversation-turn-reduce](./conversation-turn-reduce)
- [date](./date)
- [detect-patterns](./detect-patterns)
- [detect-threshold](./detect-threshold)
- [disambiguate](./disambiguate)
- [dismantle](./dismantle)
- [document-shrink](./document-shrink)
- [entities](./entities)
- [expect](./expect)
- [filter](./filter)
- [filter-ambiguous](./filter-ambiguous)
- [find](./find)
- [glossary](./glossary)
- [group](./group)
- [intersections](./intersections)
- [join](./join)
- [list](./list)
- [llm-logger](./llm-logger)
- [map](./map)
- [people](./people)
- [pop-reference](./pop-reference)
- [questions](./questions)
- [reduce](./reduce)
- [relations](./relations)
- [scale](./scale)
- [scan-js](./scan-js)
- [score](./score)
- [set-interval](./set-interval)
- [socratic](./socratic)
- [sort](./sort)
- [split](./split)
- [summary-map](./summary-map)
- [tags](./tags)
- [tag-vocabulary](./tag-vocabulary)
- [themes](./themes)
- [timeline](./timeline)
- [to-object](./to-object)
- [truncate](./truncate)
- [veiled-variants](./veiled-variants)

Chains are free to use any utilities from [`../lib`](../lib/README.md) and often rely on one or more verblets from [`../verblets`](../verblets/README.md).

