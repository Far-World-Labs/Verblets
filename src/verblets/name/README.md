# name

Generate contextually appropriate names for entities, objects, or concepts using AI-powered naming with intelligent suggestions and creative alternatives.

## Usage

```javascript
import name from './index.js';

const suggestions = await name('a productivity app for remote teams');
// Returns: ['TeamSync', 'RemoteFlow', 'CollabHub', 'WorkTogether', 'TeamBridge']
```

## API

### `name(description, options)`

**Parameters:**
- `description` (string): Description of what needs a name
- `options` (Object): Configuration options
  - `count` (number): Number of name suggestions (default: 5)
  - `style` (string): Naming style preference (optional)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<string>> - Array of suggested names

## Use Cases

### Product Naming
```javascript
const productNames = await name('eco-friendly water bottle with temperature display', {
  count: 3,
  style: 'modern and memorable'
});
// Returns creative product name suggestions
```

### Variable/Function Naming
```javascript
const functionNames = await name('function that validates email addresses and returns boolean', {
  count: 5,
  style: 'programming convention'
});
// Returns: ['validateEmail', 'isValidEmail', 'checkEmailFormat', 'verifyEmailAddress', 'emailIsValid']
```
