# to-enum

<<<<<<< HEAD
Converts and validates values against predefined enumeration sets with intelligent matching and case-insensitive comparison.

This utility provides robust enum conversion with case-insensitive matching and comprehensive validation for configuration values, user selections, and API parameters.
=======
Converts and validates values against predefined enumeration sets with intelligent matching and type safety.

This utility provides robust enum conversion with case-insensitive matching, default value handling, and comprehensive validation for configuration values, user selections, and API parameters.
>>>>>>> origin/main

## Usage

```javascript
import toEnum from './src/lib/to-enum/index.js';

<<<<<<< HEAD
// Define valid enum values as an object
const validSizes = { small: 1, medium: 1, large: 1 };
=======
// Define valid enum values
const validSizes = ['small', 'medium', 'large'];
>>>>>>> origin/main

// Convert user input to enum
const size = toEnum('MEDIUM', validSizes);
console.log(size); // 'medium'

<<<<<<< HEAD
// Handle invalid values
const invalid = toEnum('extra-large', validSizes);
console.log(invalid); // undefined
=======
// Handle invalid values with defaults
const priority = toEnum('urgent', ['low', 'high'], 'low');
console.log(priority); // 'low' (fallback)
>>>>>>> origin/main
```

## API

<<<<<<< HEAD
### `toEnum(value, enumSet)`

**Parameters:**
- `value` (any): The value to convert and validate against the enum set
- `enumSet` (Object): Object with valid enum keys (values are ignored)

**Returns:** 
- `string`: Valid enum key from the set if match found
- `undefined`: If no match found
=======
### `toEnum(value, enumSet, defaultValue)`

**Parameters:**
- `value` (any): The value to convert and validate against the enum set
- `enumSet` (Array): Array of valid enum values (strings)
- `defaultValue` (string, optional): Fallback value if conversion fails

**Returns:** 
- `string`: Valid enum value from the set
- `defaultValue`: If provided and conversion fails
- `undefined`: If no default provided and conversion fails
>>>>>>> origin/main

**Features:**
- **Case-Insensitive Matching**: Automatically handles case variations
- **Flexible Input Types**: Accepts strings, numbers, and other types
<<<<<<< HEAD
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
=======
- **Default Value Support**: Graceful fallback for invalid inputs
- **Type Safety**: Ensures output is always from the valid enum set

## Use Cases

### Configuration Validation
```javascript
// Validate environment settings
const logLevel = toEnum(process.env.LOG_LEVEL, ['debug', 'info', 'warn', 'error'], 'info');

// Validate user preferences
const theme = toEnum(userSettings.theme, ['light', 'dark', 'auto'], 'auto');
>>>>>>> origin/main
```

### API Parameter Handling
```javascript
// Validate API request parameters
<<<<<<< HEAD
const sortOrders = { asc: 1, desc: 1 };
const sortOrder = toEnum(req.query.sort, sortOrders);

const statuses = { active: 1, inactive: 1, pending: 1 };
const status = toEnum(req.body.status, statuses);
=======
const sortOrder = toEnum(req.query.sort, ['asc', 'desc'], 'asc');
const status = toEnum(req.body.status, ['active', 'inactive', 'pending']);
>>>>>>> origin/main
```

### User Interface Controls
```javascript
// Validate dropdown selections
<<<<<<< HEAD
const sizes = { xs: 1, s: 1, m: 1, l: 1, xl: 1 };
const size = toEnum(formData.size, sizes);

const priorities = { low: 1, medium: 1, high: 1, critical: 1 };
const priority = toEnum(taskData.priority, priorities);
=======
const size = toEnum(formData.size, ['xs', 's', 'm', 'l', 'xl']);
const priority = toEnum(taskData.priority, ['low', 'medium', 'high', 'critical']);
```

## Advanced Usage

### Custom Validation Logic
```javascript
// Complex enum with validation
const roles = ['admin', 'user', 'guest'];
const userRole = toEnum(inputRole?.toLowerCase?.(), roles, 'guest');

// Multiple enum sets
const validColors = ['red', 'green', 'blue'];
const validSizes = ['small', 'large'];
const color = toEnum(userColor, validColors);
const size = toEnum(userSize, validSizes);
```

### Integration with Form Validation
```javascript
// Validate form inputs
function validateForm(formData) {
  return {
    category: toEnum(formData.category, ['news', 'blog', 'tutorial']),
    status: toEnum(formData.status, ['draft', 'published'], 'draft'),
    visibility: toEnum(formData.visibility, ['public', 'private'], 'private')
  };
}
>>>>>>> origin/main
```

## Related Modules

- [`to-bool`](../to-bool/) - Boolean conversion with intelligent parsing
- [`to-number`](../to-number/) - Numeric conversion from various formats
<<<<<<< HEAD
- [`to-date`](../to-date/) - Date parsing and conversion utilities 
=======
- [`to-date`](../to-date/) - Date parsing and conversion utilities

## Error Handling

```javascript
try {
  const result = toEnum(userInput, validOptions);
  if (result === undefined) {
    console.warn('Invalid enum value provided, using system default');
  }
} catch (error) {
  console.error('Enum conversion failed:', error.message);
}
```

The function is designed to be forgiving and practical, making it ideal for handling user input and configuration values where strict validation is needed but graceful degradation is preferred. 
>>>>>>> origin/main
