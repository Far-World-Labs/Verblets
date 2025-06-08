# socratic

Guide yourself or a user toward deeper understanding by automatically posing and answering a short series of Socratic questions. The chain uses your configured LLM to generate each question and then supplies a concise answer, building a dialogue.

```javascript
import { socratic } from './index.js';

const dialogue = await socratic('I want to start exercising more').run(3);
console.log(dialogue);
/*
[
  { question: 'What benefits do you hope to gain from exercising?', answer: 'I want more energy during the day.' },
  { question: 'Why is having more energy important to you?', answer: 'So I can keep up with my kids after work.' },
  { question: 'How might regular exercise help you achieve that?', answer: 'It will improve my stamina and mood.' }
]
*/
```
