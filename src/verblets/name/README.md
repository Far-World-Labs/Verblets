# name
Generate a short, descriptive name for any text or concept.

This verblet taps into the language model's understanding of nuance to create names that capture the essence of your content. Use it whenever a simple keyword search isn't enough and you want an evocative title.

## Usage

```javascript
import { name } from '@far-world-labs';

const diaryTitle = await name(
  'Voice memos from friends sharing their hopes and worries'
);
console.log(diaryTitle); // "Shared Reflections" (example)
```
