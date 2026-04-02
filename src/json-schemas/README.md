# json-schemas

Reusable JSON Schema definitions for shaping structured LLM output. These schemas are used by the `auto` verblet for function tool definitions and can be passed to any chain or verblet via `response_format`.

```javascript
import { init } from '@far-world-labs/verblets';

const { schemas, auto } = init();

// All schemas available as a namespace
console.log(Object.keys(schemas));
// ['intent', 'cars-test', 'schema-dot-org-photograph', 'schema-dot-org-place']

// Used by the auto verblet for function tool selection
const result = await auto('Parse this address', { schemas: myCustomSchemas });
```

## Available Schemas

- `intent` — User intent classification with extracted parameters
- `cars-test` — Vehicle information structure (used in tests)
- `schema-dot-org-photograph` — Schema.org-compliant photo metadata
- `schema-dot-org-place` — Schema.org-compliant location data

Most module-specific schemas live alongside their modules (e.g., `src/chains/score/schema.js`) rather than in this shared directory. This directory holds schemas used across multiple modules or by the `auto` verblet.
