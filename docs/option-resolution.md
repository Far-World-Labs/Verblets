# Option Resolution

The option resolution system lets chains declare their tuning parameters and resolve them from consumer config, policy functions, or defaults — all in one call. This is the internal API used by chain and verblet authors. For the consumer-facing view, see [configuration.md](./configuration.md).

## nameStep + track

Most chains start with `nameStep`, which sets the operation name on config for policy targeting, then `track` to emit the `chain:start` event and obtain a lifecycle handle, followed by `getOptions` to batch-resolve all declared options:

```javascript
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import { track } from '../../lib/progress-callback/index.js';

const runConfig = nameStep('document-shrink', inputConfig);
const span = track('document-shrink', runConfig);
const { batchSize, compression } = await getOptions(runConfig, {
  batchSize: 50,                              // plain fallback
  compression: withPolicy(mapCompression),    // resolved through mapper
});
```

`nameStep` is synchronous and returns a plain config object with the composed operation path and timestamp. `track` emits a `chain:start` telemetry event and returns a lifecycle handle with `result()` and `error()` methods. The config object from `nameStep` (conventionally named `runConfig`) is passed directly to `callLlm`, `retry`, and any sub-chain calls. `getOptions` is called separately to resolve options asynchronously.

## Resolution order

For each option, `getOption` checks three sources in order:

1. **Policy function** — `config.policy[name]` if it's a function, called with `(evalContext, { logger })`
2. **Direct config** — `config[name]`
3. **Fallback** — the default provided in the spec

```javascript
// Consumer sets temperature directly:
await filter(items, 'urgent', { temperature: 0.3 });

// Or via policy:
await filter(items, 'urgent', {
  policy: { temperature: (ctx) => ctx.operation === 'filter' ? 0.1 : 0.5 },
});
```

## withPolicy and mappers

`withPolicy(mapperFn)` tags a mapper function so `getOptions` knows to run the resolved value through it. Mappers translate consumer-friendly string dials (`'low'`, `'med'`, `'high'`) into concrete internal values:

```javascript
export const mapCompression = (value) => {
  if (value === undefined) return 0.3;          // default
  if (typeof value === 'number') return value;   // passthrough
  return { low: 0.45, med: 0.3, high: 0.15 }[value] ?? 0.3;
};
```

Every mapper follows the same shape: handle `undefined` (return default), handle the concrete type (passthrough), handle string dials (lookup table). Mappers are exported from the chain module for testing and external validation.

### Override keys

When a single consumer dial maps to multiple internal values, use `withPolicy` with override keys. The sub-properties are flattened into the result and the parent key is excluded:

```javascript
const runConfig = nameStep('score', inputConfig);
const span = track('score', runConfig);
const { iterations, extremeK } = await getOptions(runConfig, {
  effort: withPolicy(mapEffort, ['iterations', 'extremeK']),
});

// Consumer writes:    { effort: 'high' }
// Mapper returns:     { iterations: 2, extremeK: 15 }
// Destructured as:    iterations = 2, extremeK = 15
```

## Operation composition

`nameStep` composes the operation path hierarchically when chains delegate to sub-chains:

```javascript
// Top-level: operation = 'document-shrink'
// Sub-chain: operation = 'document-shrink/score'
```

## getOption (single value)

For verblets or simple cases with only 1-2 options, use `getOption` directly instead of `getOptions`:

```javascript
const divergence = await getOption('divergence', config, undefined);
```

## Source

The option API — `getOption`, `getOptions`, `withPolicy`, `nameStep` — is exported from `src/lib/context/option.js`. The lifecycle handle `track` is exported from `src/lib/progress-callback/index.js`.
