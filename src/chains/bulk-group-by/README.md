# bulk-group-by

Group large lists in smaller batches using `listGroupBy`. Each batch is grouped and the results are merged into a single object.

```javascript
import bulkGroupBy from './index.js';

const notes = [
  'Lost my keys again on the way to work',
  'Just booked tickets to see my favorite band',
  'Spilled coffee all over the car seat',
  'Adopted the sweetest puppy today'
];
const groups = await bulkGroupBy(
  notes,
  'Group each note by the mood it conveys (joy, frustration, etc.)'
);
// => {
//   joy: ['Just booked tickets to see my favorite band', 'Adopted the sweetest puppy today'],
//   frustration: ['Lost my keys again on the way to work', 'Spilled coffee all over the car seat']
// }
```
