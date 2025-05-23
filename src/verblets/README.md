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

Use these modules directly or compose them inside [chains](../chains/README.md).
