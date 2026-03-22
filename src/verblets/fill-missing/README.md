# fill-missing

Infer the missing or censored portions of text or structured data. The verblet analyzes surrounding context to suggest replacements, returning a template with numbered placeholders and a map of candidates with confidence scores.

```javascript
import { fillMissing } from '@far-world-labs/verblets';
import { templateReplace } from '@far-world-labs/verblets';

const { template, variables } = await fillMissing('The ??? sailed across the ??? river.');

const confident = Object.fromEntries(
  Object.entries(variables)
    .filter(([, v]) => v.confidence > 0.75)
    .map(([k, v]) => [k, v.candidate])
);

const finalText = templateReplace(template, confident, '[unknown]');
// "The explorer sailed across the Nile river." (example)
```

## API

### `fillMissing(text, config?)`

- **text** (string): Text containing missing sections (marked with `???`, `[REDACTED]`, blanks, or any recognizable gap)
- **config.creativity** (`'low'`|`'med'`|`'high'`): Controls how aggressively the verblet guesses. `'low'` prefers `[UNKNOWN]` over uncertain fills — safe for automated pipelines. `'high'` attempts a plausible candidate for every gap — useful when a human will review. Default: balanced (no extra guidance).
- **config.llm** (string|Object): LLM configuration

**Returns:** `Promise<{ template, variables }>` where `template` is the text with numbered placeholders (`{1}`, `{2}`, ...) and `variables` maps each key to `{ original, candidate, confidence }`.
