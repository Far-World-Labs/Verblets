# name

Suggest a concise, memorable name for a subject using AI-powered naming.

## Usage

```javascript
import { name } from '@far-world-labs/verblets';

const suggestion = await name('a productivity app for remote teams');
// Returns: 'TeamSync'
```

## API

### `name(subject, config)`

**Parameters:**
- `subject` (string): Description of what needs a name
- `config` (Object): Configuration options
  - `llm` (Object): LLM model options

**Returns:** `Promise<string|undefined>` - A single suggested name, or `undefined` if unable to suggest

```javascript
const appName = await name('a CLI tool that formats JSON logs into readable tables');
// => 'LogLens'
```
