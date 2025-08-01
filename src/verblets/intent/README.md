# intent

Extract action and parameters from natural language commands. Maps user input to function names and extracts named parameters, enabling natural language function dispatch without manual argument mapping.

## Usage

```javascript
const operations = [
  {
    name: 'sendEmail',
    description: 'Send an email to a recipient',
    parameters: { to: 'email address', subject: 'email subject', body: 'email content' }
  },
  {
    name: 'setReminder',
    description: 'Set a reminder for a specific time',
    parameters: { time: 'when to remind', message: 'reminder text' }
  },
  {
    name: 'searchFiles',
    description: 'Search for files by name or content',
    parameters: { query: 'search terms', type: 'file type filter' }
  }
];

const result = await intent('remind me to call john tomorrow at 3pm', operations);
// {
//   operation: 'setReminder',
//   parameters: {
//     time: 'tomorrow at 3pm',
//     message: 'call john'
//   },
//   optionalParameters: {}
// }

// Use result to dispatch to actual functions
const handlers = { sendEmail, setReminder, searchFiles };
await handlers[result.operation](result.parameters);
```

## API

### `intent(text, operations, config)`

**Parameters:**
- `text` (string): User input to analyze
- `operations` (Array): Available operations, each with:
  - `name` (string): Function name to call
  - `description` (string): What the operation does
  - `parameters` (Object, optional): Parameter names and descriptions for extraction
- `config` (Object): Configuration options
  - `llm` (Object|string): LLM configuration or model name

**Returns:** Promise<Object> - Intent result containing:
- `operation`: Function name to invoke
- `parameters`: Object with named parameters ready to pass to the function
- `optionalParameters`: Additional parameters that might be useful

## Features

- **Function dispatch**: Returns exact function names from your operations list
- **Named parameters**: Extracts parameters as key-value pairs matching your function signatures
- **Direct invocation**: Output can be used directly with spread operator or destructuring
- **Natural language understanding**: Users can phrase commands naturally without knowing function names