# prompts

Reusable prompt templates and fragments used by chains and verblets. Each module exports a function that builds a formatted prompt string from parameters.

```javascript
import { prompts } from '@far-world-labs/verblets';

// Prompt constants — shared instruction fragments
const { onlyJSON, onlyJSONArray, contentIsQuestion } = prompts.constants;

// Wrap variable content in XML tags for clear delineation
prompts.asXML(userInput, { tag: 'context' });
// → '<context>...</context>'

// Build structured prompts for specific tasks
prompts.asEnum('classify this text', ['positive', 'negative', 'neutral']);
prompts.intent('send an email to john about the meeting');
prompts.summarize('long article text...', { budget: 100 });
```

## Key Exports

- `constants` — Shared instruction fragments (`onlyJSON`, `onlyJSONArray`, `contentIsQuestion`, etc.)
- `asXML(text, { tag })` / `wrapVariable` — Wrap content in XML tags
- `asEnum` — Build enum classification prompts
- `asJSONSchema` — Format JSON schemas as prompt instructions
- `intent` — Build intent extraction prompts
- `summarize` — Build summarization prompts with token budgets
- `generateList`, `generateCollection`, `generateQuestions` — Generation prompt builders
- `sort`, `style`, `tokenBudget` — Utility prompt builders
- `promptPiece` — Composable prompt fragments (see [SPEC.md](../lib/prompt-piece/SPEC.md))
- RAG prompt fragments: `embedRewriteQuery`, `embedMultiQuery`, `embedStepBack`, `embedSubquestions`

See [guidelines/PROMPTS.md](../../.claude/guidelines/PROMPTS.md) for prompt engineering guidelines.
