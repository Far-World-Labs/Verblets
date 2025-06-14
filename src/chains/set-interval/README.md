# setInterval

AI-guided replacement for `setInterval`.
Feed it your own natural-language heuristic; it will keep time, remember history, and supply your callback with rich context so you can build self-tuning workflows, creative generators, or living UIs.

```javascript
setInterval({
  intervalPrompt: String,   // mandatory
  fn:            Function,  // mandatory
  historySize?:  Number,
  firstInterval?:String,
  model?:        String,
}); // returns a cancel function
```

Return data from `fn` becomes `lastInvocationResult` in the subsequent prompt, enabling reducer-like evolution.
