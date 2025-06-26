# join

Use AI to fuse fragments into a coherent sequence. The chain analyzes contiguous items and merges each group using custom prompt.

## Example: Product Description

```javascript
import join from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

const features = [
  'This smartphone has a 6.5-inch display.',
  'It includes a powerful 5000mAh battery.',
  'The camera system features a 108MP sensor.',
  'It supports 5G connectivity for fast internet speeds.'
];

const productDescription = await join(features, 'Create a compelling product description by merging these features');

console.log(productDescription);
/*
'This smartphone has a 6.5-inch display, offering an immersive viewing experience. Additionally, it includes a powerful 5000mAh battery, ensuring long-lasting usage. The camera system features a 108MP sensor, capturing stunning photos. Moreover, it supports 5G connectivity for fast internet speeds, keeping you connected on the go.'
*/
```
