# Chains

Chains orchestrate multiple verblets or helper functions to perform more complex tasks. Each subdirectory exposes a specific workflow that can be imported as a single function.

Available chains:

- [anonymize](./anonymize)
- [dismantle](./dismantle)
- [list](./list)
- [questions](./questions)
- [scan-js](./scan-js)
- [sort](./sort)
- [summary-map](./summary-map)
- [bulk-reduce](./bulk-reduce)
- [test](./test)
- [test-advice](./test-advice)
- [veiled-variants](./veiled-variants)

Chains are free to use any utilities from [`../lib`](../lib/README.md) and often rely on one or more verblets from [`../verblets`](../verblets/README.md).
