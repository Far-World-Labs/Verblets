# score

Assign numeric scores to items in arrays using AI-powered evaluation with intelligent reasoning and consistent scoring criteria.

## Usage

```javascript
import score from './index.js';

const proposals = [
  'Implement AI-powered customer service chatbot',
  'Redesign company website with modern UI',
  'Launch social media marketing campaign',
  'Develop mobile app for existing platform',
  'Create employee training program'
];

const scores = await score(proposals, 'business impact potential (1-10)', { normalize: true });
// Returns: [
//   { item: 'Implement AI-powered customer service chatbot', score: 8.5 },
//   { item: 'Redesign company website with modern UI', score: 7.2 },
//   { item: 'Launch social media marketing campaign', score: 6.8 },
//   { item: 'Develop mobile app for existing platform', score: 9.1 },
//   { item: 'Create employee training program', score: 5.4 }
// ]
```

## API

### `score(array, criteria, config)`

**Parameters:**
- `array` (Array): Items to score
- `criteria` (string): Natural language description of scoring criteria
- `config` (Object): Configuration options
  - `scale` (string): Scoring scale (default: '1-10')
  - `normalize` (boolean): Normalize scores across the range (default: false)
  - `chunkSize` (number): Items per batch (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<Object>> - Array of objects with `item` and `score` properties

## Use Cases

### Resume Screening
```javascript
import score from './index.js';

const resumes = [
  'Software Engineer with 5 years React experience',
  'Full-stack developer with Node.js and Python skills',
  'Recent graduate with internship experience',
  'Senior developer with team leadership background'
];

const ranked = await score(resumes, 'suitability for senior developer role', { scale: '1-100' });
// Returns scored resumes for hiring decisions
```

### Content Quality Assessment
```javascript
const articles = [
  'Comprehensive guide to machine learning basics',
  'Quick tips for better productivity',
  'In-depth analysis of market trends',
  'Simple tutorial on web development'
];

const quality = await score(articles, 'educational value and depth', { normalize: true });
// Returns quality scores for content curation
```
