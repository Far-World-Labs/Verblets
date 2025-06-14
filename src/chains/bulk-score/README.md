# bulk-score

Score lines of text on a 0–10 scale with automatic calibration. Each batch returns a JSON array so parsing stays reliable even with long lists. The chain first scores everything, then rescors a few low, middle, and high examples to calibrate. Those references feed a second scoring pass so every item is ranked consistently using OpenAI's JSON schema enforcement.

```javascript
import bulkScore from './index.js';

const slogans = [
  'Amazing deals every day!',
  'Unlock a world of wonder',
  'Buy stuff now',
];

const { scores } = await bulkScore(slogans, 'How catchy is this marketing slogan?');
// scores like [6, 9, 2]
```
