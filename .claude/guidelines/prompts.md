# Prompt Engineering Guidelines

Prompts are algorithmic components: one responsibility, predictable behavior, composable.

## Assembly

```javascript
const { text, known, context } = resolveTexts(instructions, ['spec']);

const parts = [
  context,                                        // XML from unknown instruction keys
  `Rate each item in the list...`,
  asXML(text, { tag: 'scoring-criteria' }),
  spec && asXML(spec, { tag: 'specification' }),  // conditional
  `IMPORTANT: output valid JSON`,
];
const prompt = parts.filter(Boolean).join('\n\n');
```

`resolveTexts` normalizes the instruction parameter: known keys override internal behavior; unknown keys become `<tag>value</tag>` blocks prepended as `context`.

## Structure

Wrap variable content with `asXML()`. Place description/instruction parameters earlier — they guide interpretation more than supporting context.

Each prompt does one thing. Composability depends on it.

## Output

When the output is text, state its shape: a sentence, a list, a paragraph.

## Clarity

Define terms the LLM doesn't already know. Frame as guidelines ("focus on X", "prefer Y"), not exhaustive rules — guidelines generalize.

## Describe, don't enumerate

Examples bias the LLM toward the specific patterns shown — it pattern-matches instead of reasoning. The same is true of long do/don't lists. Describe the qualities of the desired output and the space to explore; let the LLM bring its own intelligence.

## Constants

Standard phrases live in `src/prompts/constants.js` — plain strings, no `{placeholder}` markers. Consumers compose them into the parts array.

## What to avoid

- `${contextBlock}`-style template literals — use parts composition.
- `.replace()` on prompts with `{placeholder}` markers — use parts composition.
- Flags, switches, or parameter-style syntax — natural language, not API shapes.
- Examples or do/don't lists as the carrier of a rule.
