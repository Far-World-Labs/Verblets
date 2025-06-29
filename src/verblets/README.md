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
- [list-map](./list-map) - map lists with prompts
- [list-reduce](./list-reduce) - reduce lists prompts
- [list-filter](./list-filter) - filter lists with custom instructions
- [list-group](./list-group) - group lists into categories with prompts
- [list-expand](./list-expand) - expand lists with similar items with prompts
- [conversation-turn-multi-lines](./conversation-turn-multi-lines) - generate multiple conversation turns simultaneously

Use these modules directly or compose them inside [chains](../chains/README.md).
