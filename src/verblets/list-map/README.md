# list-map

Transform a list with a single ChatGPT call by providing mapping instructions.
The function hides the boilerplate prompting so you only supply the instructions.

```javascript
import listMap from './index.js';

await listMap(['Budget smartphone', 'Luxury watch'], 'Write a short playful tagline');
// => ['Affordable tech for everyone', 'Elegance that tells time']
```
