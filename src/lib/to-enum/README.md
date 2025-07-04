# to-enum

Converts and validates values against predefined enumeration sets with intelligent matching and case-insensitive comparison.

This utility provides robust enum conversion with case-insensitive matching and comprehensive validation for configuration values, user selections, and API parameters.

## Usage

```javascript
import toEnum from './src/lib/to-enum/index.js';

// Define valid enum values as an object
const validSizes = { small: 1, medium: 1, large: 1 };

// Convert user input to enum
const size = toEnum('MEDIUM', validSizes);
console.log(size); // 'medium'

// Handle invalid values
const invalid = toEnum('extra-large', validSizes);
console.log(invalid); // undefined
```

## API

### `toEnum(value, enumSet)`

**Parameters:**
- `value` (any): The value to convert and validate against the enum set
- `enumSet` (Object): Object with valid enum keys (values are ignored)

**Returns:** 
- `string`: Valid enum key from the set if match found
- `undefined`: If no match found

**Features:**
- **Case-Insensitive Matching**: Automatically handles case variations
- **Flexible Input Types**: Accepts strings, numbers, and other types
- **Whitespace & Punctuation Handling**: Strips response formatting and cleans input
- **Type Safety**: Ensures output is always from the valid enum set or undefined

## Use Cases

### Configuration and User Input Validation
```javascript
import toEnum from './src/lib/to-enum/index.js';

// Validate environment settings with intelligent case matching
const logLevels = { debug: 1, info: 1, warn: 1, error: 1 };
const logLevel = toEnum(process.env.LOG_LEVEL, logLevels);
// Handles 'DEBUG', 'Info', 'WARN' etc. Returns undefined for invalid values

// Validate user form inputs
const themes = { light: 1, dark: 1, auto: 1 };
const theme = toEnum(userSettings.theme, themes);

const priorities = { low: 1, medium: 1, high: 1, critical: 1 };
const priority = toEnum(formData.priority, priorities);
```

### API Parameter Handling
```javascript
// Validate API request parameters
const sortOrders = { asc: 1, desc: 1 };
const sortOrder = toEnum(req.query.sort, sortOrders);

const statuses = { active: 1, inactive: 1, pending: 1 };
const status = toEnum(req.body.status, statuses);
```

### User Interface Controls
```javascript
// Validate dropdown selections
const sizes = { xs: 1, s: 1, m: 1, l: 1, xl: 1 };
const size = toEnum(formData.size, sizes);

const priorities = { low: 1, medium: 1, high: 1, critical: 1 };
const priority = toEnum(taskData.priority, priorities);
```

## Related Modules

- [`to-bool`](../to-bool/) - Boolean conversion with intelligent parsing
- [`to-number`](../to-number/) - Numeric conversion from various formats
- [`to-date`](../to-date/) - Date parsing and conversion utilities 