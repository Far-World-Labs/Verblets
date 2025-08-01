# list-batch

**Internal helper module for collection chains.** This is not part of the core verblets library and should not be used directly. It's used internally by chains like [map](../../chains/map), [filter](../../chains/filter), and [find](../../chains/find).

## Purpose

This helper processes arrays of items in a single LLM call with automatic formatting optimization. It efficiently transforms, filters, or analyzes lists without the overhead of multiple API calls.

## Internal Usage

```javascript
// This is how the map chain uses list-batch internally
const names = ['John Smith', 'mary jones', 'Dr. Robert Chen'];
const normalized = await listBatch(names, 'Normalize to proper title case');
// ['John Smith', 'Mary Jones', 'Dr. Robert Chen']
```

## Why This Exists

Collection chains needed a way to:
- Process batches of items in single LLM calls for efficiency
- Automatically handle different content types (short strings vs. long text)
- Provide consistent array output formatting
- Handle edge cases like empty arrays without API calls

## For Users

**Do not import this module directly.** Instead, use the collection chains that provide complete batch processing with retry logic, progress tracking, and other features:

- [map](../../chains/map) - Transform items with batch processing
- [filter](../../chains/filter) - Filter items efficiently
- [find](../../chains/find) - Find items using batch evaluation