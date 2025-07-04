# to-date

<<<<<<< HEAD
Convert string values to JavaScript Date objects with intelligent parsing for LLM responses.
=======
Simple date parser that converts string values to JavaScript Date objects with response formatting cleanup.

This utility is designed to parse date strings from LLM responses, handling common response formatting and providing clean error handling for invalid dates.
>>>>>>> origin/main

## Usage

```javascript
<<<<<<< HEAD
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
=======
import toDate from './src/lib/to-date/index.js';

// Parse date strings
const date1 = toDate('2023-12-25T10:30:00Z');
// => Date object for December 25, 2023

// Handle response formatting
const date2 = toDate('Answer: 2023-12-25');
// => Date object (strips "Answer: " prefix)

// Handle undefined responses
const date3 = toDate('undefined');
// => undefined
```

## API

### `toDate(value)`

**Parameters:**
- `value` (any): The value to convert to a Date (will be converted to string)

**Returns:**
- `Date`: Valid JavaScript Date object for parseable inputs
- `undefined`: When input is the string "undefined" (case-insensitive)
- **Throws Error**: "ChatGPT output [error]" for invalid date strings

**Features:**
- **Response Cleanup**: Uses `stripResponse` to remove common LLM response formatting
- **Undefined Handling**: Returns `undefined` for "undefined" string responses
- **Error Handling**: Throws descriptive errors for unparseable dates
- **Type Coercion**: Converts any input to string before processing
>>>>>>> origin/main

## Use Cases

### LLM Response Processing
```javascript
<<<<<<< HEAD
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
=======
// Process date responses from ChatGPT
const extractedDate = toDate(llmResponse);
if (extractedDate) {
  console.log('Parsed date:', extractedDate.toISOString());
}
```

### Response Validation
```javascript
// Validate LLM-generated dates
try {
  const scheduledDate = toDate(chatGptResponse);
  if (scheduledDate < new Date()) {
    console.warn('Scheduled date is in the past');
  }
} catch (error) {
  console.error('Invalid date from LLM:', error.message);
}
```

### Data Pipeline Processing
```javascript
// Process multiple date responses
const dates = llmResponses.map(response => {
  try {
    return toDate(response);
  } catch (error) {
    console.warn(`Invalid date response: ${response}`);
    return null;
  }
}).filter(Boolean);
```

## Advanced Usage

### Batch Processing with Error Handling
```javascript
function processDateResponses(responses) {
  const results = [];
  const errors = [];
  
  responses.forEach((response, index) => {
    try {
      const date = toDate(response);
      if (date !== undefined) {
        results.push({ index, date, original: response });
      } else {
        results.push({ index, date: null, original: response, reason: 'undefined' });
      }
    } catch (error) {
      errors.push({ index, original: response, error: error.message });
    }
  });
  
  return { results, errors };
}
```

### Integration with Form Processing
```javascript
// Handle form data that may contain LLM-processed dates
function processFormWithLLMDates(formData) {
  const processedData = { ...formData };
  
  // Process LLM-generated date fields
  ['startDate', 'endDate', 'deadline'].forEach(field => {
    if (formData[field]) {
      try {
        processedData[field] = toDate(formData[field]);
      } catch (error) {
        processedData[field] = null;
        console.warn(`Invalid ${field}: ${formData[field]}`);
      }
    }
  });
  
  return processedData;
}
```

### Response Format Handling
```javascript
// Handle various LLM response formats
const testResponses = [
  'Answer: 2023-12-25',
  'The date is: 2023-12-25T10:30:00Z',
  '2023-12-25',
  'undefined',
  'UNDEFINED',
  'invalid-date-string'
];

testResponses.forEach(response => {
  try {
    const result = toDate(response);
    console.log(`"${response}" -> ${result ? result.toISOString() : 'undefined'}`);
  } catch (error) {
    console.log(`"${response}" -> ERROR: ${error.message}`);
  }
});
```

## Related Modules

- [`strip-response`](../strip-response/) - Response formatting cleanup utility
- [`to-number`](../to-number/) - Numeric conversion from LLM responses
- [`to-bool`](../to-bool/) - Boolean conversion from LLM responses
- [`to-enum`](../to-enum/) - Enum validation from LLM responses

## Error Handling

```javascript
// Graceful error handling
function safeToDate(value, defaultValue = null) {
  try {
    const result = toDate(value);
    return result !== undefined ? result : defaultValue;
  } catch (error) {
    console.warn(`Date parsing failed for "${value}": ${error.message}`);
    return defaultValue;
  }
}

// Usage
const parsedDate = safeToDate(llmResponse, new Date());
>>>>>>> origin/main
```

## Implementation Notes

This utility is specifically designed for processing LLM responses and uses:

1. **String Conversion**: All inputs are converted to strings before processing
2. **Response Stripping**: Removes common LLM response prefixes and formatting
3. **Native Date Parsing**: Uses JavaScript's built-in `Date` constructor
4. **Undefined Detection**: Special handling for "undefined" responses from LLMs
5. **Error Consistency**: Throws standardized "ChatGPT output [error]" messages

<<<<<<< HEAD
## Related Modules

- [`to-number`](../to-number/) - Numeric conversion from LLM responses
- [`to-bool`](../to-bool/) - Boolean conversion from LLM responses
- [`to-enum`](../to-enum/) - Enum validation from LLM responses

=======
>>>>>>> origin/main
The function is optimized for simplicity and reliability when processing date strings from language model outputs rather than being a comprehensive date parsing solution. 