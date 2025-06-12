# date

Iteratively refine LLM answers until they produce a valid JavaScript `Date` object that satisfies the prompt. Before asking for a date, the chain asks the language model to suggest a few quick checks that a correct answer should satisfy. Each returned date is evaluated against those expectations with the `bool` verblt and retried if any fail.

```javascript
import date from './index.js';

const release = await date('When was the original Star Wars film released?');
// => new Date('1977-05-25')
```

The chain asks for a date using prompt constants shared with primitive verblets. It then verifies the result with the `bool` verblet and retries until the date is deemed correct or attempts run out.
