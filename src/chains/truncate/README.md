# truncate

Intelligently truncate text by scoring potential cut points based on custom instructions.

This chain uses the existing `score` chain to evaluate different truncation points and select the best one according to your specific instructions. Rather than making assumptions about "semantic boundaries," it follows whatever criteria you specify in the prompt.

## Usage

```javascript
import truncate from 'verblets/src/chains/truncate/index.js';

const text = `The project overview explains core concepts. Technical implementation details follow with code examples. Finally, usage guidelines provide practical guidance.`;

const result = await truncate(text, 'Keep only the technical implementation details', {
  limit: 80,
  unit: 'characters'
});

// {
//   truncated: "Technical implementation details follow with code examples.",
//   cutPoint: 57,
//   cutType: "sentence",
//   preservationScore: 0.92
// }
```

## Parameters

- `text` (string) - The text to truncate
- `instructions` (string) - Instructions for evaluating truncation points (default: 'Find the best truncation point')
- `config` (object) - Configuration options

## Configuration Options

- `limit` (number) - Maximum length constraint (default: 100)
- `unit` (string) - Unit type: 'characters', 'words', or 'sentences' (default: 'characters')
- `chunkSize` (number) - Batch size for scoring potential cut points (default: 5)
- `llm` (object) - LLM configuration passed to the score chain

## Return Value

Always returns an object with:

- `truncated` (string) - The selected truncated text
- `cutPoint` (number) - Position where text was cut (in specified units)
- `cutType` (string) - How the cut was made: 'full', 'sentence', 'scored', 'exact', 'shortest', 'fallback', or 'none'
- `preservationScore` (number) - Score from the LLM indicating how well the truncation meets the criteria

## How It Works

1. **Split Text**: Breaks text into potential cut points (usually at sentence boundaries)
2. **Create Candidates**: Generates cumulative chunks representing each possible truncation
3. **Score Options**: Uses the `score` chain to evaluate each potential cut point against your instructions
4. **Select Best**: Chooses the highest-scoring option that stays within the limit
5. **Fallback**: If scoring fails, uses simple truncation as backup

## Examples

**Custom truncation criteria:**
```javascript
const result = await truncate(
  'Introduction here. Main argument with evidence. Conclusion and summary.',
  'Prioritize keeping the main argument',
  { limit: 50 }
);
// LLM evaluates which cut point best preserves the main argument
```

**Word-based limits:**
```javascript
const result = await truncate(
  'Technical documentation about API endpoints and their parameters.',
  'Keep the most informative content',
  { limit: 8, unit: 'words' }
);
// Truncates to 8 words based on informativeness
```

**Sentence-based limits:**
```javascript
const result = await truncate(
  'First sentence. Second sentence. Third sentence.',
  'Keep complete thoughts only',
  { limit: 2, unit: 'sentences' }
);
// Keeps the 2 most relevant sentences
```

**Specific content filtering:**
```javascript
const result = await truncate(
  'Background info. Key findings from the study. Methodology details.',
  'Focus on key findings only',
  { limit: 60 }
);
// Scores each section and keeps the part about key findings
```

## Key Advantages

- **Flexible Instructions**: Can follow any truncation criteria you specify
- **Uses Existing Infrastructure**: Leverages the proven `score` chain for evaluation
- **Bulk Processing**: Efficiently processes multiple cut points simultaneously
- **No Assumptions**: Doesn't assume what's "important" - follows your prompt
- **Reliable Fallback**: Always returns a valid result even if LLM scoring fails

## Error Handling

If the scoring chain fails, the function gracefully falls back to simple truncation based on the specified unit type. Console warnings are logged for debugging, but the function always returns a valid result.