# Functional Programming Utilities

A set of helper functions for composing callbacks and escaping XML. These utilities make it easy to build small event systems or safely handle HTML snippets without mutating your data.

## Example

```javascript
import { hook, unhook, xmlEscape } from './index.js';

const listeners = [];

// add listeners
hook(listeners, () => console.log('clicked'));
hook(listeners, () => console.log('hovered'));

listeners.forEach(fn => fn());
// => clicked
// => hovered

// remove the first listener
unhook(listeners, listeners[0]);

console.log(xmlEscape('<span>Tom & Jerry</span>'));
// => '&lt;span&gt;Tom &amp; Jerry&lt;/span&gt;'
```

These functions are used throughout the library to build composable pipelines without side effects.
