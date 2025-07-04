# to-date

Convert string values to JavaScript Date objects with intelligent parsing for LLM responses.

## Usage

```javascript
import toDate from './index.js';

// Convert various date formats
const date1 = toDate('2024-01-15');           // => Date object
const date2 = toDate('January 15, 2024');     // => Date object
const date3 = toDate('2024-01-15T10:30:00Z'); // => Date object
const date4 = toDate('undefined');            // => undefined

// Invalid dates throw errors
try {
  const invalid = toDate('not a date');
} catch (error) {
  console.log(error.message); // => 'ChatGPT output [error]'
}
```

## Parameters

- **input** (any): The value to convert to a Date
  - Strings: Parsed using JavaScript's Date constructor
  - 'undefined' string: Returns undefined
  - Other types: Converted to string and processed

## Return Value

Returns a Date object if conversion is successful, `undefined` if input is 'undefined', or **throws an error** if the input cannot be converted to a valid date.

## Examples

```javascript
// Common date formats
toDate('2024-01-15');                    // => Date object
toDate('January 15, 2024');              // => Date object
toDate('2024-01-15T10:30:00Z');          // => Date object
toDate('Mon Jan 15 2024');               // => Date object
toDate('undefined');                     // => undefined

// Invalid inputs (throw errors)
toDate('invalid date');                  // => throws Error('ChatGPT output [error]')
toDate('2024-13-45');                    // => throws Error('ChatGPT output [error]')
toDate('');                              // => throws Error('ChatGPT output [error]')
```

## Use Cases

### LLM Response Processing
```javascript
import toDate from './index.js';

// Process date responses from LLMs
const llmResponse = await chatGPT("When was the document created?");
try {
  const createdDate = toDate(llmResponse);
  console.log(`Document created on: ${createdDate.toLocaleDateString()}`);
} catch (error) {
  console.log('LLM did not return a valid date');
}

// Handle undefined responses
const maybeDate = toDate(await chatGPT("What's the deadline?"));
if (maybeDate === undefined) {
  console.log('No deadline specified');
}
```

## Implementation Notes

This utility is specifically designed for processing LLM responses and uses:

1. **String Conversion**: All inputs are converted to strings before processing
2. **Response Stripping**: Removes common LLM response prefixes and formatting
3. **Native Date Parsing**: Uses JavaScript's built-in `Date` constructor
4. **Undefined Detection**: Special handling for "undefined" responses from LLMs
5. **Error Consistency**: Throws standardized "ChatGPT output [error]" messages

## Related Modules

- [`to-number`](../to-number/) - Numeric conversion from LLM responses
- [`to-bool`](../to-bool/) - Boolean conversion from LLM responses
- [`to-enum`](../to-enum/) - Enum validation from LLM responses

The function is optimized for simplicity and reliability when processing date strings from language model outputs rather than being a comprehensive date parsing solution. 