# Verblets

The `verblets` directory contains individual utilities that wrap specific language-model workflows. Each verblet exports a single function and usually includes its own examples, tests and optional JSON schema.

Available verblets:

- [auto](./auto)
- [bool](./bool)
- [enum](./enum)
- [intent](./intent)
- [number](./number)
- [number-with-units](./number-with-units)
- [schema-org](./schema-org)
- [to-object](./to-object) – see its [README](./to-object/README.md) for details.
- [list-map](./list-map) - map lists with custom instructions
- [list-reduce](./list-reduce) - reduce lists with custom instructions
- [list-partition](./list-partition) - partition lists with custom instructions and optional category list

Use these modules directly or compose them inside [chains](../chains/README.md).
