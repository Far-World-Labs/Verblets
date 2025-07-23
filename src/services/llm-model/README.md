# llm-model

Intelligent model selection service that negotiates the best LLM for specific tasks using capability-based matching and optimization strategies.

## Usage

```javascript
import { negotiate } from './index.js';

// Negotiate for fast, cheap processing
const model = await negotiate({ fast: true, cheap: true });
// Returns: { modelName: 'gpt-3.5-turbo', provider: 'openai', ... }

// Negotiate for high-quality reasoning
const reasoningModel = await negotiate({ good: true, reasoning: true });
// Returns: { modelName: 'gpt-4', provider: 'openai', ... }

// Privacy-first selection (overrides all other criteria)
const privateModel = await negotiate({ privacy: true, fast: true });
// Returns: { modelName: 'llama-local', provider: 'local', ... }
```

## API

### `negotiate(criteria, options)`

**Parameters:**
- `criteria` (Object): Capability requirements
  - `fast` (boolean): Prioritize response speed
  - `cheap` (boolean): Optimize for cost efficiency
  - `good` (boolean): Prioritize output quality
  - `reasoning` (boolean): Require advanced reasoning capabilities
  - `multi` (boolean): Need multimodal support (text + images)
  - `privacy` (boolean): Require privacy-preserving models (overrides all others)
- `options` (Object): Configuration options
  - `fallback` (string): Fallback model if negotiation fails
  - `constraints` (Object): Additional constraints (token limits, etc.)

**Returns:** Promise<Object> - Selected model configuration

## Model Selection Strategy

### Privacy First Rule
Privacy models take **absolute precedence** over all other criteria:
```javascript
// Privacy overrides everything
const model = await negotiate({ privacy: true, fast: true, good: true });
// Always returns a privacy-preserving model regardless of other flags
```

### Capability Matrix
The service maintains a capability matrix mapping models to their strengths:

| Model | Fast | Cheap | Good | Reasoning | Multi | Privacy |
|-------|------|-------|------|-----------|-------|---------|
| gpt-3.5-turbo | ✓ | ✓ | - | - | - | - |
| gpt-4 | - | - | ✓ | ✓ | - | - |
| gpt-4-vision | - | - | ✓ | ✓ | ✓ | - |
| claude-3-haiku | ✓ | ✓ | - | - | - | - |
| claude-3-sonnet | - | - | ✓ | ✓ | - | - |
| llama-local | - | - | - | - | - | ✓ |

### Negotiation Algorithm
1. **Privacy Check**: If privacy is required, return privacy model immediately
2. **Capability Matching**: Find models that satisfy all required capabilities
3. **Optimization**: Among matching models, select based on preference order
4. **Fallback**: If no perfect match, use closest approximation or fallback

## Use Cases

### Bulk Processing Optimization
```javascript
import { negotiate } from './index.js';

// Process large datasets efficiently
const bulkModel = await negotiate({ fast: true, cheap: true });

const results = await Promise.all(
  largeDataset.map(item => processWithModel(item, bulkModel))
);
```

### Quality-Critical Analysis
```javascript
// Complex reasoning tasks
const analysisModel = await negotiate({ good: true, reasoning: true });

const insights = await analyzeWithModel(complexData, analysisModel);
```

### Privacy-Sensitive Operations
```javascript
// Personal data processing
const privateModel = await negotiate({ privacy: true });

const anonymized = await processPersonalData(sensitiveData, privateModel);
```

### Multimodal Applications
```javascript
// Image and text processing
const visionModel = await negotiate({ multi: true, good: true });

const analysis = await analyzeImageWithText(image, description, visionModel);
```

## Advanced Configuration

### Custom Fallback Strategy
```javascript
const model = await negotiate(
  { reasoning: true, multi: true }, 
  { fallback: 'gpt-4' }
);
```

### Constraint-Based Selection
```javascript
const model = await negotiate(
  { fast: true, good: true },
  { 
    constraints: { 
      maxTokens: 4000,
      maxCostPerToken: 0.001 
    }
  }
);
```

## Integration Patterns

### With ChatGPT Service
```javascript
import chatGPT from '../chatgpt/index.js';
import { negotiate } from './llm-model/index.js';

const model = await negotiate({ fast: true, cheap: true });
const response = await chatGPT(prompt, { modelOptions: model });
```

### Dynamic Model Selection
```javascript
const selectModel = async (taskType) => {
  switch (taskType) {
    case 'bulk':
      return await negotiate({ fast: true, cheap: true });
    case 'analysis':
      return await negotiate({ good: true, reasoning: true });
    case 'privacy':
      return await negotiate({ privacy: true });
    default:
      return await negotiate({ good: true });
  }
};
```
The `llm-model` service returns the best model configuration for your tasks based on cost, speed, and privacy needs.
