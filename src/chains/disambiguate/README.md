# disambiguate

Determine the intended meaning of a polysemous word or short phrase based on surrounding context.
The chain lists common meanings and filters them down to the one that fits best.

```javascript
import disambiguate from './index.js';

const result = await disambiguate({
  term: 'bat',
  context: 'The child swung the bat at the baseball.'
});

console.log(result.meaning);
// => "a club used in sports like baseball"
```

## Use case: clarifying travel conversations

When a traveler says, "I spoke with the coach about my seat," it helps to know
whether they mean a sports instructor or an airline seating class. This chain
uses language model reasoning to resolve that ambiguity automatically.
