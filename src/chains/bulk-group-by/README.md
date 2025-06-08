# bulk-group-by

Group large lists in smaller batches using `listGroupBy`. Each batch is grouped and the results are merged into a single object.

```javascript
import bulkGroupBy from './index.js';

const reflections = [
  'I missed a deadline but learned to ask for help sooner',
  'Volunteered at a shelter and felt more compassionate',
  'Admitted a difficult truth to a friend and it hurt our relationship',
  'Helped a neighbor move and felt our community grow'
];
const groups = await bulkGroupBy(
  reflections,
  'Group each note by the life lesson it represents (humility, compassion, integrity, community)'
);
// => {
//   humility: ['I missed a deadline but learned to ask for help sooner'],
//   compassion: ['Volunteered at a shelter and felt more compassionate'],
//   integrity: ['Admitted a difficult truth to a friend and it hurt our relationship'],
//   community: ['Helped a neighbor move and felt our community grow']
// }
```
