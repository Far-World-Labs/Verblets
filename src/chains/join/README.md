# join

Use AI to fuse fragments into a coherent sequence. The chain analyzes contiguous items and merges each group using a join string or custom prompt. When all items belong to a single narrative, it behaves like `Array.join` but can add natural transitions in any language.

## Example: Story with Spanish segues

```javascript
import join from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

const fragments = [
  'The detective woke up late.',
  'Meanwhile in Tokyo, a festival began.',
  'An old diary was discovered in the attic.',
  'Lightning split the sky above the harbor.'
];

const story = await join(fragments, ' ', (parts) =>
  chatGPT(`Merge these fragments into one story. Insert a short Spanish segue between each: ${parts.join(' || ')}`)
);

console.log(story);
/*
[
  'The detective woke up late. Luego, en Tokio comenzó un festival. Después, an old diary was discovered in the attic. Finalmente, lightning split the sky above the harbor.'
]
*/
```
