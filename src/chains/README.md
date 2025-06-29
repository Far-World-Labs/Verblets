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

Available chains:

- [anonymize](./anonymize)
- [collect-terms](./collect-terms)
- [conversation](./conversation)
- [date](./date)
- [disambiguate](./disambiguate)
- [dismantle](./dismantle)
- [expect](./expect)
- [filter](./filter)
- [filter-ambiguous](./filter-ambiguous)
- [find](./find)
- [glossary](./glossary)
- [group](./group)
- [join](./join)
- [list](./list)
- [llm-logger](./llm-logger)
- [map](./map)
- [questions](./questions)
- [reduce](./reduce)
- [score](./score)
- [set-interval](./set-interval)
- [socratic](./socratic)
- [sort](./sort)
- [split](./split)
- [summary-map](./summary-map)
- [test](./test)
- [test-advice](./test-advice)
- [themes](./themes)
- [veiled-variants](./veiled-variants)

Chains are free to use any utilities from [`../lib`](../lib/README.md) and often rely on one or more verblets from [`../verblets`](../verblets/README.md).

