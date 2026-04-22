# Prompt Engineering Guidelines

Prompts in verblets are algorithmic components. Each one has a clear responsibility, a focused purpose, and reliable behavior across diverse inputs.

## Assembly

Assemble prompts from an array of parts, filtering out falsy values:

```javascript
const { text, known, context } = resolveTexts(instructions, ['spec']);

const parts = [
  context,                                        // XML from unknown instruction keys
  `Rate each item in the list...`,
  asXML(text, { tag: 'scoring-criteria' }),
  spec && asXML(spec, { tag: 'specification' }),  // conditional section
  `IMPORTANT: output valid JSON`,
];
const prompt = parts.filter(Boolean).join('\n\n');
```

This replaces template literals with embedded `${contextBlock}` suffixes, `.replace()` on constants with `{placeholder}` markers, and ad-hoc `bundleContext ? ... : ...` conditionals.

## Structure

Separate static instructions from dynamic content. Use XML blocks via `asXML()` for variable content that changes per call. Caller-supplied context arrives automatically through `resolveTexts` — unknown instruction keys become `<tag>value</tag>` XML blocks prepended to the prompt.

Keep prompts focused on one task. Composability depends on each prompt doing one thing well. If a prompt tries to analyze, classify, and summarize in one call, it becomes fragile.

## Output Requirements

Always specify the expected output format. Ambiguity in output instructions produces unpredictable responses. When structured output is needed, use `response_format` with a JSON schema (see [JSON Schema Guidelines](./json-schemas.md)). When text output is needed, state the expected shape: a single sentence, a list, a paragraph.

## Clarity

Define terms the LLM needs to know. Leave out terms it already understands. Frame instructions as guidelines ("focus on X", "prefer Y") rather than exhaustive rules — guidelines generalize better than rigid constraints. Avoid cognitive overload: if a prompt needs more than a screen of instructions, it probably needs to be split across multiple calls.

## Prompt Constants

Standard behaviors live in `src/prompts/constants.js`. Use them for consistent instruction phrasing across the codebase — things like output formatting, name style ("succinct names"), or budget instructions. When you find yourself writing the same instruction in multiple prompts, extract it.

Prompt constants should be plain strings (content only), not templates with `{placeholder}` markers. Consumers compose them into the parts array alongside other sections.

## What to Avoid

Avoid adding examples to prompts. Examples bias the LLM toward the specific patterns shown, reducing generality across diverse inputs. Guidelines and criteria produce more flexible behavior.

Prompts are for LLMs, not programs. Avoid flags, switches, or parameter-like syntax. Natural language instructions work better than structured command formats.

## Automated Analysis

The `analyze-prompt` intent handler (in `src/chains/test-analysis/intent-handlers/`) can evaluate prompts against these principles programmatically.
