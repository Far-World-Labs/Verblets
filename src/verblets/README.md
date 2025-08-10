# Verblets

Verblets are simple, focused utilities that perform specific tasks. They are the building blocks of the Verblets library.

## What are Verblets?

Verblets are small, single-purpose functions that:
- Perform one specific task well. A verblet should invoke chatgpt or an AI no more than once. 
- Should be fast to respond. Large-context verblets should be treated as a chain.
- Should not retry and should have minimal processing logic.
- Have clear, predictable inputs and outputs
- Can be easily composed together
- Are lightweight and fast

## Categories

 - **Data Processing**: Transform and manipulate data
 - **Text Analysis**: Analyze and process text content
 - **Validation**: Check and validate data formats
 - **Utilities**: Common helper functions

## Design Principles

 - **Single Responsibility**: Each verblet does one thing well
 - **Composability**: Verblets can be combined to create complex workflows
 - **Predictability**: Outputs are constrained to well behaved datatypes and practical value ranges

## Usage

Verblets are typically used as building blocks in chains or as standalone utilities in your applications.

## Model Configuration

All verblets support standard model configuration options:

```javascript
const result = await verbletName(input, prompt, {
  llm: {
    modelName: 'gpt-4',           // Specific model selection
    temperature: 0.7,             // Response randomness (0.0-1.0)
    maxTokens: 500,               // Maximum response length
    topP: 0.9,                    // Nucleus sampling parameter
    frequencyPenalty: 0.0,        // Reduce repetition
    presencePenalty: 0.0          // Encourage topic diversity
  }
  // Most verblets have minimal additional configuration
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

// Default balanced approach (recommended for most verblets)
{ llm: { modelName: 'fastGoodCheap' } }
```

The `verblets` directory contains individual utilities that wrap specific language-model workflows. Each verblet exports a single function and usually includes its own examples, tests and optional JSON schema.

Available verblets:

- [auto](./auto)
- [bool](./bool)
- [name](./name) - generate evocative names from text
- [enum](./enum)
- [intent](./intent)
- [number](./number)
- [number-with-units](./number-with-units)
- [date](../chains/date)
- [sentiment](./sentiment) - classify text sentiment
- [schema-org](./schema-org)
- [name-similar-to](./name-similar-to) - suggest short names matching a style
- [name](./name) - name something from a definition or description
- [to-object](./to-object) – see its [README](./to-object/README.md) for details.
- [list-batch](./list-batch) - generic batched list operations with XML/newline auto-detection
- [list-expand](./list-expand) - expand lists with similar items with prompts

Use these modules directly or compose them inside [chains](../chains/README.md).
