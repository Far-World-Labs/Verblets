# llm-model

Centralized LLM model management service with intelligent model negotiation, global overrides, and privacy-first selection.

## Usage

```javascript
import modelService from './llm-model/index.js';

// Get best available model
const model = modelService.getBestPublicModel();

// Negotiate model based on requirements
const modelKey = modelService.negotiateModel('fastGood', {
  fast: true,
  cheap: true
});

// Get model configuration for API requests
const requestConfig = modelService.getRequestConfig({
  modelName: 'fastGoodCheap',
  prompt: 'Hello, world!',
  maxTokens: 1000
});
```

## Core Methods

### Model Selection
- **`getBestPublicModel()`**: Get the current best public model instance
- **`getBestPrivateModel()`**: Get the privacy model instance (local/private execution)
- **`getModel(name)`**: Get specific model by name or key
- **`updateBestPublicModel(name)`**: Update the default public model

### Model Negotiation
- **`negotiateModel(preferred, negotiation)`**: Intelligent model selection based on requirements
  - **`preferred`** (string): Preferred model name
  - **`negotiation`** (object): Requirements object with boolean flags:
    - **`privacy`** (boolean): Require privacy model (overrides all other options)
    - **`fast`** (boolean): Require fast response time
    - **`cheap`** (boolean): Require cost-effective model
    - **`good`** (boolean): Require high-quality responses
    - **`reasoning`** (boolean): Require advanced reasoning capabilities
    - **`multi`** (boolean): Require multimodal support (text + images)

### Request Configuration
- **`getRequestParameters(options)`**: Generate API request parameters
- **`getRequestConfig(options)`**: Generate complete request configuration
- **`applyGlobalOverrides(modelOptions)`**: Apply global overrides to model options

### Global Overrides
- **`setGlobalOverride(key, value)`**: Set global override for all requests
- **`clearGlobalOverride(key)`**: Clear specific or all global overrides
- **`getGlobalOverride(key)`**: Get current global override value
- **`getAllGlobalOverrides()`**: Get all current global overrides

## Model Negotiation Priority

The service follows a **privacy-first** approach with intelligent model selection:

### 1. Privacy Models (Absolute Priority)
```javascript
// Privacy models override ALL other requirements
const privacyModel = modelService.negotiateModel('any', { privacy: true });
// Always returns 'privacy' if available, undefined if not configured
```

### 2. Requirement-Based Selection
Models are selected based on capability requirements in priority order:
```javascript
// Fast + Cheap + Good (best balance)
const balanced = modelService.negotiateModel(null, { 
  fast: true, 
  cheap: true, 
  good: true 
});

// Reasoning-focused
const reasoning = modelService.negotiateModel(null, { 
  reasoning: true 
});

// Multimodal support
const multimodal = modelService.negotiateModel(null, { 
  multi: true 
});
```

### 3. Model Priority Order
When multiple models match requirements, selection follows this priority:
1. `fastGoodCheap` - Optimal balance
2. `fastGood` - Quality with speed
3. `goodCheap` - Quality with cost efficiency
4. `good` - Pure quality focus
5. `fast` - Speed priority
6. `cheap` - Cost priority
7. Reasoning models (when required)

## Features

- **Privacy-First Architecture**: Privacy models take absolute precedence
- **Intelligent Negotiation**: Automatic model selection based on capability requirements
- **Global Override System**: Centralized control over model behavior
- **Token Management**: Automatic token counting and limit handling
- **Request Optimization**: Efficient API request parameter generation
- **Fallback Handling**: Graceful degradation when requirements can't be met

## Use Cases

### Privacy-Sensitive Operations
```javascript
// Always use privacy model for sensitive data
const result = await chatGPT(sensitivePrompt, {
  modelOptions: { 
    negotiate: { privacy: true } 
  }
});
```

### Bulk Processing Optimization
```javascript
// Optimize for speed and cost in bulk operations
const modelKey = modelService.negotiateModel(null, {
  fast: true,
  cheap: true
});

for (const item of bulkData) {
  const result = await chatGPT(item.prompt, {
    modelOptions: { modelName: modelKey }
  });
}
```

### Quality-Critical Tasks
```javascript
// Prioritize quality for important analysis
const qualityModel = modelService.negotiateModel(null, {
  good: true,
  reasoning: true
});

const analysis = await chatGPT(complexPrompt, {
  modelOptions: { modelName: qualityModel }
});
```

### Multimodal Processing
```javascript
// Handle image + text inputs
const multiModel = modelService.negotiateModel(null, {
  multi: true,
  good: true
});

const result = await chatGPT(imagePrompt, {
  modelOptions: { modelName: multiModel }
});
```

## Advanced Usage

### Global Override Management
```javascript
// Set global temperature override
modelService.setGlobalOverride('temperature', 0.7);

// Force specific model globally
modelService.setGlobalOverride('modelName', 'privacy');

// Override negotiation globally
modelService.setGlobalOverride('negotiate', { fast: true, cheap: true });

// Clear specific override
modelService.clearGlobalOverride('temperature');

// Clear all overrides
modelService.clearGlobalOverride();
```

### Dynamic Model Selection
```javascript
// Adapt model selection based on context
function selectModelForTask(taskType, dataSize) {
  const negotiation = {};
  
  if (taskType === 'analysis') {
    negotiation.good = true;
    negotiation.reasoning = true;
  } else if (taskType === 'bulk') {
    negotiation.fast = true;
    negotiation.cheap = true;
  } else if (taskType === 'sensitive') {
    negotiation.privacy = true;
  }
  
  if (dataSize > 1000) {
    negotiation.fast = true;
  }
  
  return modelService.negotiateModel(null, negotiation);
}
```

### Request Configuration Customization
```javascript
// Generate custom request configurations
const config = modelService.getRequestConfig({
  modelName: 'fastGoodCheap',
  prompt: 'Analyze this data',
  systemPrompt: 'You are a data analyst',
  maxTokens: 2000,
  temperature: 0.3,
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'analysis', schema: analysisSchema }
  }
});

// Use with API client
const response = await apiClient.post('/chat/completions', config);
```

### Model Monitoring
```javascript
// Monitor model usage and performance
class ModelMonitor {
  constructor() {
    this.usage = new Map();
  }
  
  trackUsage(modelName, tokens, cost) {
    if (!this.usage.has(modelName)) {
      this.usage.set(modelName, { calls: 0, tokens: 0, cost: 0 });
    }
    
    const stats = this.usage.get(modelName);
    stats.calls++;
    stats.tokens += tokens;
    stats.cost += cost;
  }
  
  getOptimalModel(requirements) {
    const modelKey = modelService.negotiateModel(null, requirements);
    this.trackUsage(modelKey, 0, 0); // Placeholder tracking
    return modelKey;
  }
}
```

## Integration Patterns

### With ChatGPT Service
```javascript
import chatGPT from '../../lib/chatgpt/index.js';
import modelService from './index.js';

async function smartChatGPT(prompt, options = {}) {
  const { requirements, ...otherOptions } = options;
  
  // Negotiate model based on requirements
  const modelName = modelService.negotiateModel(null, requirements);
  
  return await chatGPT(prompt, {
    modelOptions: { modelName },
    ...otherOptions
  });
}

// Usage
const result = await smartChatGPT('Complex analysis task', {
  requirements: { good: true, reasoning: true }
});
```

### With Chains and Verblets
```javascript
// In a chain function
export default async function myChain(input, instructions, config = {}) {
  const { llm, ...options } = config;
  
  // Apply global overrides to LLM options
  const modelOptions = modelService.applyGlobalOverrides(llm || {});
  
  return await chatGPT(prompt, {
    modelOptions,
    ...options
  });
}
```

### With Testing Framework
```javascript
// Test with different model configurations
describe('Model Service', () => {
  beforeEach(() => {
    modelService.clearGlobalOverride();
  });
  
  it('should prioritize privacy models', () => {
    const model = modelService.negotiateModel(null, { privacy: true });
    expect(model).toBe('privacy');
  });
  
  it('should handle global overrides', () => {
    modelService.setGlobalOverride('temperature', 0.5);
    const options = modelService.applyGlobalOverrides({});
    expect(options.temperature).toBe(0.5);
  });
});
```

## Related Modules

- [`chatgpt`](../../lib/chatgpt/README.md) - Main LLM interface that uses this service
- [`model.js`](./model.js) - Individual model class definition
- [`constants/models`](../../constants/models.js) - Model configuration constants

## Error Handling

```javascript
try {
  const model = modelService.getModel('nonexistent');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Model not available, using fallback');
    const fallback = modelService.getBestPublicModel();
  }
}

// Handle negotiation failures
const modelKey = modelService.negotiateModel(null, { reasoning: true });
if (!modelKey) {
  console.log('No reasoning model available');
  // Fallback to best available model
  const fallback = modelService.getBestPublicModel();
}
```

## Configuration

The service automatically loads model configurations from `constants/models.js` and supports:

- **Model Definitions**: Name, endpoint, token limits, capabilities
- **Default Parameters**: Temperature, top_p, penalties
- **Capability Mapping**: Fast, cheap, good, reasoning, multi, privacy flags
- **Priority Ordering**: Automatic selection based on capability requirements

## Privacy and Security

- **Privacy-First**: Privacy models always take precedence over all other requirements
- **Local Execution**: Privacy models run locally without external API calls
- **Data Protection**: Sensitive operations automatically routed to privacy models
- **Override Protection**: Global overrides can force privacy model usage across all operations 