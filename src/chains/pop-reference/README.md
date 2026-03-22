# pop-reference

Find pop culture references that metaphorically capture the essence of a given sentence based on a description.

## Usage

```javascript
import popReference from '@fwl/verblets/chains/pop-reference';

const references = await popReference(
  "She finally made a decision after months of doubt",
  "pivotal moment of choosing clarity over comfort"
);

// Returns:
// [
//   {
//     reference: "when Neo takes the red pill",
//     source: "The Matrix",
//     context: "he chooses uncomfortable truth over comforting illusion",
//     score: 0.88,
//     match: {
//       text: "finally made a decision",
//       start: 4,
//       end: 27
//     }
//   },
//   ...
// ]
```

## API

### popReference(sentence, description, options?)

#### Parameters

- `sentence` (string): The sentence to metaphorically compare
- `description` (string): A short free-text descriptor guiding tone, intent, or interpretive nuance
- `options` (object, optional):
  - `include` (Array<string | {reference: string, percent: number}>): List of cultural domains or specific sources to draw references from
  - `referenceContext` (boolean): Include a short description of the pop culture scene or idea referenced (default: false)
  - `referencesPerSource` (number): Number of desired references to return per source (default: 2)
  - `llm` (string | object): LLM model configuration

#### Returns

Array of PopCultureReference objects:
- `reference` (string): The metaphorical reference
- `source` (string): Name of source material
- `context` (string, optional): Extra context for the reference
- `score` (number): 0-1 strength of the fit
- `match` (object): 
  - `text` (string): Substring of input sentence this metaphor connects to
  - `start` (number): Character offset (inclusive)
  - `end` (number): Character offset (exclusive)

## Examples

### Using specific sources

```javascript
const references = await popReference(
  "The meeting dragged on with everyone avoiding the real issue",
  "workplace dysfunction and avoidance",
  {
    include: ["The Office", "Parks and Recreation", "Silicon Valley"]
  }
);
```

### Using weighted sources

```javascript
const references = await popReference(
  "They had to choose between safety and adventure",
  "life-changing decision between comfort and growth",
  {
    include: [
      { reference: "Lord of the Rings", percent: 60 },
      { reference: "Star Wars", percent: 30 },
      { reference: "Harry Potter", percent: 10 }
    ]
  }
);
```

### Including context descriptions

```javascript
const references = await popReference(
  "Everything was falling apart but they kept pretending it was fine",
  "denial in the face of obvious disaster",
  {
    include: ["Internet Memes", "The Office"],
    referenceContext: true,
    referencesPerSource: 3
  }
);
```

## Notes

- The `description` parameter is crucial for guiding the interpretation - it sets the tone and perspective for finding appropriate references
- References are specific moments or scenes, not just general mentions of the source
- Scores indicate how well the reference captures the essence of the sentence (0-1 scale)
- The `match` object shows exactly which part of the sentence each reference connects to