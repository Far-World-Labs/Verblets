# embed-normalize-text

Normalize text for consistent processing. Applies NFC normalization, unifies line endings, collapses whitespace, and optionally strips patterns — all while preserving paragraph structure.

```javascript
import embedNormalizeText from '@verblets/lib/embed-normalize-text';

const raw = "Café\r\n\r\nFirst   paragraph.\r\nSecond line.";
const clean = embedNormalizeText(raw);
// → "Café\n\nFirst paragraph.\nSecond line."

// Strip footnotes before chunking
const article = "The discovery [1] was groundbreaking [2].";
const stripped = embedNormalizeText(article, {
  stripPatterns: [/\[\d+\]/g],
});
// → "The discovery was groundbreaking ."
```

## API

### `embedNormalizeText(text, options?)` → `string`

| Param | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Input text to normalize |
| `options.stripPatterns` | `RegExp[]` | `[]` | Patterns to remove from text |

**Processing order:** NFC normalize → unify line endings (`\r\n`/`\r` → `\n`) → collapse non-newline whitespace → apply strip patterns → re-collapse whitespace → trim.

## Use case

Preparing documents for chunking or embedding. Raw text from different sources has inconsistent encoding, line endings, and extraneous markup. Normalizing upfront prevents duplicate or mismatched chunks downstream.
