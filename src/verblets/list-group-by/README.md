# list-group-by

Group a list of items with a single ChatGPT call by providing grouping instructions. Returns an object mapping group names to arrays of items.

```javascript
import listGroupBy from './index.js';

const reflections = [
  'I missed a deadline but learned to ask for help sooner',
  'Volunteered at a shelter and felt more compassionate',
  'Admitted a difficult truth to a friend and it hurt our relationship',
  'Helped a neighbor move and felt our community grow'
];
const groups = await listGroupBy(
  reflections,
  'Group each entry by the life lesson it represents (humility, compassion, integrity, community)'
);
// => {
//   humility: ['I missed a deadline but learned to ask for help sooner'],
//   compassion: ['Volunteered at a shelter and felt more compassionate'],
//   integrity: ['Admitted a difficult truth to a friend and it hurt our relationship'],
//   community: ['Helped a neighbor move and felt our community grow']
// }
```
