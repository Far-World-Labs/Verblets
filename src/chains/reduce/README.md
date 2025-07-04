# reduce

Intelligently reduce large arrays to smaller, more manageable sets using AI-powered selection with sophisticated filtering and prioritization strategies.

## Usage

```javascript
import reduce from './index.js';

const articles = [
  'Introduction to Machine Learning',
  'Advanced Neural Networks',
  'Basic Statistics for Data Science',
  'Deep Learning Fundamentals',
  'Linear Algebra Basics',
  'Python Programming Guide',
  'Data Visualization Techniques',
  'SQL Database Management'
];

const essential = await reduce(articles, 'most important for ML beginners', { targetSize: 3 });
// Returns: ['Introduction to Machine Learning', 'Basic Statistics for Data Science', 'Linear Algebra Basics']
```

## API

### `reduce(array, criteria, config)`

**Parameters:**
- `array` (Array): Items to reduce
- `criteria` (string): Natural language description of selection criteria
- `config` (Object): Configuration options
  - `targetSize` (number): Desired number of items (default: 5)
  - `chunkSize` (number): Items per batch (default: 10)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array> - Reduced array containing the most relevant items

## Use Cases

### Content Curation
```javascript
import reduce from './index.js';

const blogPosts = [
  'How to Start a Blog',
  'SEO Best Practices',
  'Content Marketing Strategies',
  'Social Media Tips',
  'Email Marketing Guide',
  'Website Design Principles',
  'Analytics and Metrics',
  'Monetization Strategies'
];

const beginner = await reduce(blogPosts, 'essential for new bloggers', { targetSize: 4 });
// Returns the most important posts for beginners
```

### Research Paper Selection
```javascript
const papers = [
  'Attention Is All You Need',
  'BERT: Pre-training of Deep Bidirectional Transformers',
  'GPT-3: Language Models are Few-Shot Learners',
  'ImageNet Classification with Deep Convolutional Neural Networks',
  'Generative Adversarial Networks',
  'ResNet: Deep Residual Learning for Image Recognition'
];

const foundational = await reduce(papers, 'foundational papers in deep learning', { targetSize: 3 });
// Returns the most influential foundational papers
```
