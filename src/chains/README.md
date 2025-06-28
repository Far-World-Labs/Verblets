# Chains

Chains orchestrate multiple verblets or helper functions to perform more complex tasks. Each subdirectory exposes a specific workflow that can be imported as a single function.

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

