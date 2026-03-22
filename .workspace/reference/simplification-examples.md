# Simplification Examples
> Before/after code comparisons for evaluating simplification value.

## veiled-variants: Platform adoption

**Before** (107 lines) — calls `run` (chatGPT) directly, no retry, no `response_format`, no shared config. 40 lines of manual JSON parsing recovery.

```javascript
// Current: raw chatGPT call, manual JSON parsing
const options = { modelOptions: { modelName } };
const results = await Promise.all(prompts.map((p) => run(p, options)));
return results
  .map((r) => {
    try {
      const jsonMatch = r.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const parsed = JSON.parse(r);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (error) {
      const trimmed = r.trim();
      if (trimmed.length > 200) {
        const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 20);
        if (sentences.length >= 3) return sentences.slice(0, 5).map((s) => s.trim());
      }
      const quotes = trimmed.match(/"([^"]+)"/g);
      if (quotes && quotes.length > 0) return quotes.map((q) => q.replace(/"/g, ''));
      console.warn('Failed to parse JSON response, using raw text:', error.message);
      return [trimmed];
    }
  })
  .flat();
```

**After** (proposed, ~45 lines total) — uses retry, response_format, parallelBatch, shared config.

```javascript
// Proposed: platform-conformant
const variantsSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'veiled_variants',
    schema: {
      type: 'object',
      properties: { items: { type: 'array', items: { type: 'string' } } },
      required: ['items'],
      additionalProperties: false,
    },
  },
};

const veiledVariants = async ({ prompt, llm, maxAttempts = 3, onProgress, now = new Date() }) => {
  const framingPrompts = [
    scientificFramingPrompt(prompt),
    causalFramePrompt(prompt),
    softCoverPrompt(prompt),
  ];

  const results = await parallelBatch(framingPrompts, (p) =>
    retry(chatGPT, {
      label: 'veiled-variant',
      maxAttempts, onProgress, now, chainStartTime: now,
      chatGPTPrompt: p,
      chatGPTConfig: { llm, modelOptions: { response_format: variantsSchema } },
    }),
    { maxParallel: 3 }
  );

  return results.flat();
};
```

**What changes:**
- 40 lines JSON parsing → 0 (response_format + auto-unwrap)
- No retry → retry with maxAttempts
- Promise.all → parallelBatch (concurrency control)
- Hardcoded `modelName: 'privacy'` → standard `llm` config
- Added onProgress, now

**Risk:** `modelName: 'privacy'` was a specific alias — need to verify it's still valid before removing.

**Verdict:** Clear win. Complexity existed to compensate for not using platform infrastructure.
