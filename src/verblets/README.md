# Verblets

Verblets are single-purpose AI functions. Each makes at most one LLM call, has no retry logic, and returns a constrained output. They are the building blocks that [chains](../chains/) orchestrate into workflows. For implementation patterns, see [DESIGN.md](./DESIGN.md).

## Configuration

All verblets accept a config object with model selection and tuning:

```javascript
const result = await verbletName(input, {
  llm: { fast: true, cheap: true },  // capability-based model selection
  temperature: 0.7,                    // response randomness
  maxTokens: 500,                      // maximum response length
});
```

Model selection works the same way as chains — string shorthand, capability object, or full config. See [chains/README.md](../chains/README.md#configuration) for the full reference.

## Primitives

Extract basic data types from natural language with high reliability.

- [bool](./bool) — Interpret yes/no, true/false, and conditional statements
- [classify](./enum) — Classify free-form input into one of several predefined options
- [number](./number) — Convert text to a single number
- [number-with-units](./number-with-units) — Parse measurements and convert between unit systems
- [sentiment](./sentiment) — Classify text as positive, negative, or neutral

## Content

- [commonalities](./commonalities) — Identify what items share conceptually
- [fill-missing](./fill-missing) — Predict content for redacted or corrupted sections
- [list-batch](./list-batch) — Batched list operations with XML/newline auto-detection
- [list-expand](./list-expand) — Expand lists with similar items
- [name](./name) — Parse names handling titles, suffixes, and cultural variations
- [name-similar-to](./name-similar-to) — Generate names following example patterns
- [central-tendency-lines](./central-tendency-lines) — Evaluate how central an item is to a category
- [schema-org](./schema-org) — Convert unstructured data to schema.org JSON-LD format

## Retrieval (RAG Query Rewriting)

Transform queries for search and retrieval-augmented generation. All accept a `divergence` option controlling variant diversity.

- [embed-rewrite-query](./embed-rewrite-query) — Rewrite queries for clarity and specificity
- [embed-multi-query](./embed-multi-query) — Generate diverse query variants
- [embed-step-back](./embed-step-back) — Broaden queries to underlying concepts
- [embed-subquestions](./embed-subquestions) — Split complex queries into atomic sub-questions
- [embed-rewrite-to-output-doc](./embed-rewrite-to-output-doc) — Rewrite a query as if it were the answer document

## Utilities

- [auto](./auto) — Match task descriptions to available tools using function calling
- [expect](./expect) — Jest-style AI assertions: `expect(actual).toEqual(expected)`
- [intent](./intent) — Extract action and parameters from natural language commands
- [phail-forge](./phail-forge) — Transform simple prompts into expert-level prompts
