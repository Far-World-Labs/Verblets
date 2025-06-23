# people-list

Generate structured lists of people that match specific criteria or schemas. Creates realistic personas with names, descriptions, and relevant attributes for simulations, testing, or content generation.

```javascript
import peopleList from './src/verblets/people-list/index.js';

// Simple usage
const neighbors = await peopleList('friendly neighbors who enjoy baking', 3);
console.log(neighbors);
// [
//   { name: 'Maria Santos', description: 'Retired teacher who bakes sourdough bread weekly' },
//   { name: 'Tom Chen', description: 'Software engineer who makes elaborate birthday cakes' },
//   { name: 'Janet Williams', description: 'Stay-at-home mom famous for her chocolate chip cookies' }
// ]

// Advanced usage with custom configuration
const experts = await peopleList(
  'AI safety researchers with different specializations and backgrounds',
  4,
  { 
    llm: { model: 'gpt-4' },
    maxTokens: 1000 
  }
);
```

Perfect for creating realistic test data, generating diverse character sets for simulations, populating user personas for UX research, or building speaker lists for conversation chains and focus groups.
