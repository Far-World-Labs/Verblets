# split

LLM-powered text splitter that inserts delimiters where your instructions apply.
Use it when you need to divide long text by meaning rather than exact characters.

```javascript
import split from './index.js';
import fs from 'fs';

const comedySet = fs.readFileSync('standup-routine.txt', 'utf8');

const TOPIC = '---29373947292---';
const PUNCHLINE = '---187271933228---';
const topicsMarked = await split(comedySet, 
  'between different comedy topics or subject changes', 
  { delimiter: TOPIC }
);

const topics = topicsMarked.split(TOPIC);

const jokes = await Promise.all(
  topics.map(topic => split(topic, 'after sentences that end with punchlines', { delimiter: PUNCHLINE }))
);