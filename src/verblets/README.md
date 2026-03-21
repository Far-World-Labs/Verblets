# Verblets

Verblets are simple, focused utilities that perform specific tasks. They are the building blocks of the Verblets library.

## What are Verblets?

Verblets are small, single-purpose functions that:

- Perform one specific task well. A verblet should invoke the llm module or an AI no more than once.
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
  llm: 'fastGoodCheap', // Model selection (string shorthand, capability object, or { modelName })
  temperature: 0.7, // Response randomness (0.0-1.0)
  maxTokens: 500, // Maximum response length
  topP: 0.9, // Nucleus sampling parameter
  frequencyPenalty: 0.0, // Reduce repetition
  presencePenalty: 0.0, // Encourage topic diversity
});
```

### Model Selection Strategies

```javascript
// Privacy-first for sensitive data
{ llm: { sensitive: true } }

// Optimized for bulk operations
{ llm: { fast: true, cheap: true } }

// Quality-critical operations
{ llm: { good: true } }

// Default balanced approach (recommended for most verblets)
{ llm: 'fastGoodCheap' }
```

The `verblets` directory contains individual utilities that wrap specific language-model workflows. Each verblet exports a single function and usually includes its own examples, tests and optional JSON schema.

Available verblets:

- [auto](./auto) - automatic structured output from prompts
- [bool](./bool) - extract boolean answers
- [central-tendency-lines](./central-tendency-lines) - evaluate item centrality in a category
- [commonalities](./commonalities) - find shared traits across items
- [enum](./enum) - classify into predefined categories
- [expect](./expect) - LLM-powered assertions for testing
- [fill-missing](./fill-missing) - infer missing values in structured data
- [intent](./intent) - detect user intent from text
- [list-batch](./list-batch) - generic batched list operations with XML/newline auto-detection
- [list-expand](./list-expand) - expand lists with similar items
- [name](./name) - generate names from descriptions
- [name-similar-to](./name-similar-to) - suggest names matching a style
- [number](./number) - extract numeric values
- [number-with-units](./number-with-units) - extract numbers with units
- [phail-forge](./phail-forge) - enhance prompts to expert level
- [schema-org](./schema-org) - classify with Schema.org types
- [sentiment](./sentiment) - classify text sentiment
- [embed-multi-query](./embed-multi-query) - generate diverse query variants
- [embed-rewrite-query](./embed-rewrite-query) - rewrite search queries for clarity
- [embed-step-back](./embed-step-back) - broaden queries to underlying concepts
- [embed-subquestions](./embed-subquestions) - split complex queries into sub-questions

Use these modules directly or compose them inside [chains](../chains/README.md).
