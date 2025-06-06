# list-group-by

Group a list of items with a single ChatGPT call by providing grouping instructions. Returns an object mapping group names to arrays of items.

```javascript
import listGroupBy from './index.js';

const diary = [
  'Lost my keys again on the way to work',
  'Just booked tickets to see my favorite band',
  'Spilled coffee all over the car seat',
  'Adopted the sweetest puppy today'
];
const groups = await listGroupBy(
  diary,
  'Group each entry by the emotion it conveys (joy, frustration, etc.)'
);
// => {
//   joy: ['Just booked tickets to see my favorite band', 'Adopted the sweetest puppy today'],
//   frustration: ['Lost my keys again on the way to work', 'Spilled coffee all over the car seat']
// }
```
