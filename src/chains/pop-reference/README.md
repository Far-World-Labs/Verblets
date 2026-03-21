# pop-reference

Find pop culture references that metaphorically capture the meaning of a sentence.

## Example

```javascript
import popReference from './index.js';

const refs = await popReference(
  "Everything was falling apart but they kept pretending it was fine",
  "denial in the face of obvious disaster",
  { include: ["Internet Memes", "The Office"], referenceContext: true }
);
// => [
//   {
//     reference: "the 'This is Fine' dog",
//     source: "Internet Memes",
//     context: "a dog sits in a burning room insisting everything is okay",
//     score: 0.94,
//     match: { text: "kept pretending it was fine", start: 37, end: 63 }
//   },
//   ...
// ]
```

## API

### `popReference(sentence, description, options?)`

- **sentence** (string): The sentence to find metaphors for
- **description** (string): Interpretive framing guiding tone and perspective
- **options**:
  - `include` (array): Cultural domains or weighted sources — strings like `"Star Wars"` or objects like `{ reference: "Lord of the Rings", percent: 60 }`
  - `referenceContext` (boolean, default: false): Include scene/idea description
  - `referencesPerSource` (number, default: 2): References to return per source
  - `llm` (string|object): LLM configuration

### Return value

Array of `{ reference, source, context?, score, match: { text, start, end } }`.

The `description` parameter is key — it determines the interpretive lens. The same sentence yields very different references depending on whether you frame it as "heroic determination" vs "foolish stubbornness."
