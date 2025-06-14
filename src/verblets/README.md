# Verblets

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

Use these modules directly or compose them inside [chains](../chains/README.md).
