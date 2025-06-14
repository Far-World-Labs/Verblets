# Chains

Chains orchestrate multiple verblets or helper functions to perform more complex tasks. Each subdirectory exposes a specific workflow that can be imported as a single function.

Available chains:

- [anonymize](./anonymize)
- [bulk-map](./bulk-map)
- [bulk-reduce](./bulk-reduce)
- [bulk-filter](./bulk-filter)
- [bulk-group](./bulk-group)
- [dismantle](./dismantle)
- [disambiguate](./disambiguate)
- [intersections](./intersections)
- [list](./list)
- [questions](./questions)
- [socratic](./socratic)
- [glossary](./glossary)
- [scan-js](./scan-js)
- [sort](./sort)
- [summary-map](./summary-map)
- [themes](./themes)
- [test](./test)
- [test-advice](./test-advice)
- [veiled-variants](./veiled-variants)
- [collect-terms](./collect-terms) - gather complex vocabulary

Chains are free to use any utilities from [`../lib`](../lib/README.md) and often rely on one or more verblets from [`../verblets`](../verblets/README.md).

