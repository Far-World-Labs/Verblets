# chatgpt

Clean interface for OpenAI's ChatGPT API integration with robust error handling and flexible configuration options.

## Usage

```javascript
import chatgpt from './chatgpt/index.js';

const response = await chatgpt('Explain quantum computing in simple terms');
console.log(response);
// => "Quantum computing is a revolutionary approach to computation..."

// With configuration
const response2 = await chatgpt('Write a haiku about coding', {
  model: 'gpt-4',
  temperature: 0.8,
  maxTokens: 100
});
```

## Parameters

- **`prompt`** (string, required): The text prompt to send to ChatGPT
- **`config`** (object, optional): Configuration options
  - **`model`** (string, default: 'gpt-3.5-turbo'): The GPT model to use
  - **`temperature`** (number, default: 0.7): Controls randomness (0.0 to 2.0)
  - **`maxTokens`** (number, optional): Maximum tokens in the response
  - **`topP`** (number, default: 1.0): Nucleus sampling parameter
  - **`frequencyPenalty`** (number, default: 0.0): Frequency penalty (-2.0 to 2.0)
  - **`presencePenalty`** (number, default: 0.0): Presence penalty (-2.0 to 2.0)
  - **`stream`** (boolean, default: false): Enable streaming responses
  - **`apiKey`** (string, optional): OpenAI API key (defaults to environment variable)

## Return Value

Returns a string containing the ChatGPT response, or a stream object if streaming is enabled.

## Features

- **Simple API**: Clean, promise-based interface for ChatGPT interactions
- **Model Flexibility**: Support for different GPT models (GPT-3.5, GPT-4, etc.)
- **Parameter Control**: Fine-tune responses with temperature, penalties, and token limits
- **Streaming Support**: Handle both regular and streaming responses
- **Error Handling**: Robust error management with meaningful error messages
- **Environment Integration**: Automatic API key detection from environment variables
- **Rate Limiting**: Built-in handling of API rate limits and retries

## Use Cases

### Content Generation
```javascript
const blogPost = await chatgpt('Write a blog post about sustainable gardening', {
  model: 'gpt-4',
  maxTokens: 800,
  temperature: 0.7
});
```

<<<<<<< HEAD
=======
### Code Assistance
```javascript
const codeExplanation = await chatgpt(`
  Explain this JavaScript function:
  function fibonacci(n) {
    return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2);
  }
`, {
  temperature: 0.3  // Lower temperature for more focused technical responses
});
```

### Creative Writing
```javascript
const story = await chatgpt('Write a short story about a time-traveling librarian', {
  model: 'gpt-4',
  temperature: 1.0,  // Higher temperature for more creativity
  maxTokens: 500
});
```

### Data Analysis
```javascript
const analysis = await chatgpt(`
  Analyze this sales data and provide insights:
  Q1: $125,000
  Q2: $143,000
  Q3: $138,000
  Q4: $156,000
`, {
  temperature: 0.2  // Low temperature for analytical tasks
});
```

>>>>>>> origin/main
## Advanced Usage

### Streaming Responses
```javascript
const stream = await chatgpt('Tell me a long story', {
  stream: true,
  maxTokens: 1000
});

// Handle streaming data
stream.on('data', (chunk) => {
  process.stdout.write(chunk);
});

stream.on('end', () => {
  console.log('\nStory complete!');
});
```

### Custom Model Configuration
```javascript
const response = await chatgpt(prompt, {
  model: 'gpt-4-turbo-preview',
  temperature: 0.5,
  topP: 0.9,
  frequencyPenalty: 0.2,
  presencePenalty: 0.1
});
```

### Batch Processing
```javascript
const prompts = [
  'Summarize the benefits of renewable energy',
  'Explain machine learning in one paragraph',
  'Describe the water cycle'
];

const responses = await Promise.all(
  prompts.map(prompt => chatgpt(prompt, { maxTokens: 200 }))
);
```

## Configuration

### Environment Variables
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Optional: Set default model
export OPENAI_DEFAULT_MODEL="gpt-4"
```

### Programmatic Configuration
```javascript
const config = {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 500
};

const response = await chatgpt('Your prompt here', config);
```

<<<<<<< HEAD
=======
## Integration Patterns

### With Chain Processing
```javascript
import chatgpt from './chatgpt/index.js';

async function processContent(text) {
  const summary = await chatgpt(`Summarize: ${text}`);
  const keywords = await chatgpt(`Extract keywords: ${summary}`);
  const sentiment = await chatgpt(`Analyze sentiment: ${summary}`);
  
  return { summary, keywords, sentiment };
}
```

### With Error Recovery
```javascript
async function robustChatGPT(prompt, config = {}) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await chatgpt(prompt, config);
    } catch (error) {
      attempt++;
      if (attempt === maxRetries) throw error;
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Related Modules

- [`llm-logger`](../llm-logger/README.md) - Log and monitor LLM interactions
- [`with-inactivity-timeout`](../with-inactivity-timeout/README.md) - Add timeout handling to requests
- [`ask`](../../chains/ask/README.md) - Higher-level question-answering interface

## Error Handling

```javascript
try {
  const response = await chatgpt(prompt, config);
  console.log('Response received:', response);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid or missing OpenAI API key');
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded, please try again later');
  } else if (error.message.includes('model')) {
    console.error('Requested model is not available');
  } else if (error.message.includes('timeout')) {
    console.error('Request timed out');
  } else {
    console.error('ChatGPT request failed:', error.message);
  }
}
```

>>>>>>> origin/main
## Security Considerations

- **API Key Protection**: Never hardcode API keys in source code
- **Input Validation**: Validate and sanitize prompts before sending
- **Rate Limiting**: Implement appropriate rate limiting to avoid API abuse
- **Cost Monitoring**: Monitor token usage to control API costs
- **Content Filtering**: Be aware of OpenAI's content policy and usage guidelines 