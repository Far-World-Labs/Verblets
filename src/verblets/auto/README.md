# Auto Function Selection Verblet

Automatically select and execute the most appropriate verblet function for any given task. This verblet uses AI to analyze your request and choose the best tool from the available schema library, making it perfect for dynamic workflows and intelligent task routing.

## Usage

### Chatbot Integration

```javascript
// Build a smart chatbot that automatically selects the right processing
const chatbotHandler = async (userMessage) => {
  const taskAnalysis = await auto(`
    User message: "${userMessage}"
    
    Determine what the user wants to accomplish and select the appropriate function.
  `);
  
  // The AI has selected the best function and prepared the arguments
  console.log(`Processing with: ${taskAnalysis.name}`);
  
  // You can now execute the selected function with the prepared arguments
  return taskAnalysis;
};

// Examples of what the chatbot can handle:
await chatbotHandler("How are people feeling about our new product launch?");
// Might select: sentiment analysis or data processing functions

await chatbotHandler("Can you help me brainstorm marketing ideas?");
// Might select: list generation or creative content functions
```

## API Reference

### `auto(text, config)`

Analyzes the input text and automatically selects the most appropriate function from the available schema library.

**Parameters**

- `text` (string): Natural language description of the task or request to be processed
- `config` (object, optional): Configuration options
  - `llm` (object): Language model configuration options
  - Additional options passed to the underlying ChatGPT service

**Returns**

- `Promise<object>`: Function selection result containing:
  - `name` (string): Name of the selected function
  - `arguments` (object): Arguments prepared for the selected function
  - `functionArgsAsArray` (array): Arguments formatted as an array for compatibility

**Example Response Structure**

```javascript
{
  name: 'sentiment',
  arguments: { 
    text: "This is the text to analyze" 
  },
  functionArgsAsArray: [{ 
    text: "This is the text to analyze" 
  }]
}
```