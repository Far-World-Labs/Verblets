# conversation-turn-reduce

**Internal helper module for the conversation chain.** This is not part of the core verblets library and should not be used directly. Use the main [conversation chain](../conversation) instead.

## Purpose

This helper generates conversation responses for multiple speakers where each participant can see and respond to previous speakers' contributions within the same turn. It's used internally by the conversation chain to handle multi-speaker dialogue generation.

## Internal Usage

```javascript
// This is how the conversation chain uses this helper internally
const responses = await conversationTurnReduce({
  speakers: [
    { id: 'alice', name: 'Alice', bio: 'Software engineer' },
    { id: 'bob', name: 'Bob', bio: 'Product manager' }
  ],
  topic: 'Should we refactor the codebase?',
  history: previousMessages,
  rules: { customPrompt: 'Keep responses brief' }
});
```

## Why This Exists

The conversation chain needed a way to generate responses where:
- Multiple speakers respond in sequence
- Each speaker can reference previous speakers in the current turn
- Responses maintain individual personality and perspective

This helper module provides that functionality using the map chain internally.

## For Users

**Do not import this module directly.** Instead, use the main conversation chain which provides a complete conversation management system with proper state handling, turn management, and other features.

See: [conversation chain](../conversation)