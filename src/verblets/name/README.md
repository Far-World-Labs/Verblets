# name

Generate contextually appropriate names for entities, objects, or concepts using AI-powered naming with intelligent suggestions and creative alternatives.

## Usage

```javascript
import { name } from '@far-world-labs/verblets';

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

The `style` option steers the output. For example, `'programming convention'` generates camelCase function names:

```javascript
const functionNames = await name('function that validates email addresses and returns boolean', {
  count: 5,
  style: 'programming convention'
});
// => ['validateEmail', 'isValidEmail', 'checkEmailFormat', 'verifyEmailAddress', 'emailIsValid']
```
