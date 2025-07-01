# score

Score lines of text on a 0–10 scale with automatic calibration. We use 0-10 scores instead of 0.0-1.0 to work better with LLMs that aren't very capable at fine-grained decimal scoring. Each batch returns a JSON array so parsing stays reliable even with long lists. The chain first scores everything, then rescores a few low, middle, and high examples to calibrate. Those references feed a second scoring pass so every item is ranked consistently using OpenAI's JSON schema enforcement.

```javascript
import score from './index.js';

const slogans = [
  'Amazing deals every day!',
  'Unlock a world of wonder',
  'Buy stuff now',
];

const { scores } = await score(slogans, 'How catchy is this marketing slogan?');
// scores like [6, 9, 2]
```
