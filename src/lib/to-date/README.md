# to-date

Parse a string value into a JavaScript Date object. Designed for post-processing LLM responses that contain dates.

```javascript
import { init } from '@far-world-labs/verblets';

const { toDate } = init();

toDate('2023-12-25');              // => Mon Dec 25 2023 00:00:00 ...
toDate('December 25, 2023');       // => Mon Dec 25 2023 00:00:00 ...
toDate('undefined');               // => undefined
toDate('not-a-date');              // throws Error('LLM output [error]')
```

## API

### `toDate(value)`

- **value** (any): Coerced to string, then stripped of markdown formatting via `stripResponse` before parsing with `new Date()`.

**Returns:** A `Date` if parsing succeeds, `undefined` if the cleaned string is `"undefined"`. Throws if the result is an invalid date.

The function is intentionally strict — callers should catch and handle the error rather than silently propagating bad dates.

## Related

- [to-number](../to-number/README.md) — numeric coercion with the same strip-and-parse pattern
- [to-bool](../to-bool/README.md) — boolean coercion
- [to-enum](../to-enum/README.md) — constrained string matching
