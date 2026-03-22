# auto

Select the most appropriate function for a task using LLM tool calling. Converts JSON schemas into function tools, sends them to the LLM alongside your text, and returns the selected function name with prepared arguments. The LLM decides which function to call — you dispatch the result.

```javascript
import { auto } from '@far-world-labs/verblets';

const result = await auto('remind me to call john tomorrow at 3pm');
// {
//   name: 'setReminder',
//   arguments: { time: 'tomorrow at 3pm', message: 'call john' },
//   functionArgsAsArray: [{ time: 'tomorrow at 3pm', message: 'call john' }],
//   noMatch: false
// }

// Dispatch to your handler
const handlers = { setReminder, sendEmail, searchFiles };
await handlers[result.name](...result.functionArgsAsArray);
```

## API

### `auto(text, config)`

- `text` (string): Natural language description of the task
- `config` (Object):
  - `schemas` (Object): Map of function name → JSON schema. Each schema needs `description` and `properties`. Default: the library's built-in schema set from `src/json-schemas/`.
  - `defaultFunction` (string): Function name to return when no schema matches
  - `defaultArguments` (Object): Arguments to return on no match
  - `llm` (string|Object): LLM configuration

**Returns:** `Promise<Object>` with:
- `name` (string|null): Selected function name, or `defaultFunction` / `null` on no match
- `arguments` (Object): Prepared arguments for the function
- `functionArgsAsArray` (Array): Arguments as an array for spread-style invocation
- `noMatch` (boolean): `true` if no function was selected
- `reason` (string, when `noMatch`): The LLM's text response explaining why
