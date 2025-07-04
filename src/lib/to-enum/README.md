# to-enum

Validate and convert string values to enumerated types with intelligent matching and flexible validation for LLM response processing.

## Usage

```javascript
import toEnum from './index.js';

const colors = ['red', 'green', 'blue'];
const result = toEnum('Red', colors);  // => 'red'

const sizes = ['small', 'medium', 'large'];
const size = toEnum('med', sizes);     // => 'medium'

const invalid = toEnum('purple', colors);  // => null
```

## API

### `toEnum(value, enumArray, options)`

**Parameters:**
- `value` (any): Value to validate and convert
- `enumArray` (Array): Array of valid enum values
- `options` (Object): Configuration options
  - `caseSensitive` (boolean): Case-sensitive matching (default: false)
  - `fuzzyMatch` (boolean): Enable fuzzy matching (default: true)
  - `threshold` (number): Fuzzy match threshold 0-1 (default: 0.8)

**Returns:** Valid enum value or `null` if no match found

## Features

- **Case-Insensitive Matching**: Automatically handles case variations
- **Fuzzy Matching**: Finds closest matches for partial or misspelled inputs
- **Flexible Input Types**: Handles strings, numbers, and other types
- **LLM-Optimized**: Designed for processing AI model responses
- **Null Safety**: Returns null for invalid inputs instead of throwing errors

## Use Cases

### Status Validation
```javascript
import toEnum from './index.js';

const statuses = ['pending', 'approved', 'rejected'];
const userStatus = toEnum('PENDING', statuses);  // => 'pending'
```

### Category Processing
```javascript
const categories = ['technology', 'business', 'entertainment'];
const category = toEnum('tech', categories);  // => 'technology'
```

### Configuration Validation
```javascript
const logLevels = ['debug', 'info', 'warn', 'error'];
const level = toEnum('WARNING', logLevels);  // => 'warn'
```
