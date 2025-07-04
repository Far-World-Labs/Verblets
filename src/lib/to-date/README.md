# to-date

Converts string values to JavaScript Date objects with intelligent parsing for LLM responses.

## Usage

```javascript
import toDate from './index.js';

// Basic date conversion
const date1 = toDate('2023-12-25');
console.log(date1); // Mon Dec 25 2023 00:00:00 GMT...

const date2 = toDate('December 25, 2023');
console.log(date2); // Mon Dec 25 2023 00:00:00 GMT...

// Invalid dates throw errors
try {
  toDate('invalid-date');
} catch (error) {
  console.log(error.message); // "Invalid date: invalid-date"
}
```

## Parameters

- **`value`** (any): The value to convert to a Date object
  - If `value` is already a Date object, returns it unchanged
  - If `value` is a string, attempts to parse it as a date
  - If `value` is a number, treats it as a timestamp
  - If `value` is null or undefined, returns null

## Return Value

- Returns a JavaScript Date object for valid date inputs
- Returns `null` for null/undefined inputs
- Throws an error for invalid date strings or unsupported types

## Examples

```javascript
// Various date formats
toDate('2023-12-25T10:30:00Z');     // ISO format
toDate('12/25/2023');               // US format
toDate('25/12/2023');               // UK format (may be ambiguous)
toDate('Dec 25, 2023');             // Natural language
toDate('2023-12-25 10:30:00');      // SQL format

// Timestamp conversion
toDate(1703505600000);              // Unix timestamp

// Existing Date objects
const existing = new Date();
toDate(existing);                   // Returns the same Date object

// Null handling
toDate(null);                       // Returns null
toDate(undefined);                  // Returns null

// Invalid inputs (throw errors)
toDate('not-a-date');               // Error: Invalid date: not-a-date
toDate({});                         // Error: Invalid date: [object Object]
```

## Use Cases

### Processing LLM Date Responses
```javascript
import toDate from './index.js';

// Convert various date formats from LLM responses
const responses = [
  'The event is on December 25, 2023',
  'Meeting scheduled for 2023-12-25',
  'Deadline: 12/25/2023'
];

const dates = responses.map(response => {
  // Extract date portion (implementation depends on your needs)
  const dateStr = extractDateFromResponse(response);
  return toDate(dateStr);
});
```

### Data Validation
```javascript
function validateEventDate(input) {
  try {
    const date = toDate(input);
    if (date && date > new Date()) {
      return date;
    }
    throw new Error('Date must be in the future');
  } catch (error) {
    throw new Error(`Invalid event date: ${error.message}`);
  }
}
```

### Form Processing
```javascript
function processForm(formData) {
  return {
    name: formData.name,
    birthDate: toDate(formData.birthDate),
    startDate: toDate(formData.startDate),
    endDate: toDate(formData.endDate)
  };
}
```

## Implementation Notes

- Built specifically for processing LLM responses that may contain dates in various formats
- Provides consistent error handling with descriptive messages
- Handles edge cases like null/undefined inputs gracefully
- Uses JavaScript's native Date parsing with additional validation

## Related Modules

- [`to-number`](../to-number/README.md) - Convert values to numbers
- [`to-bool`](../to-bool/README.md) - Convert values to booleans
- [`to-enum`](../to-enum/README.md) - Convert values to enumerated types 