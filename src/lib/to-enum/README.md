# to-enum

Converts and validates values against predefined enumeration sets with intelligent matching and type safety.

This utility provides robust enum conversion with case-insensitive matching, default value handling, and comprehensive validation for configuration values, user selections, and API parameters.

## Usage

```javascript
import toEnum from './src/lib/to-enum/index.js';

// Define valid enum values
const validSizes = ['small', 'medium', 'large'];

// Convert user input to enum
const size = toEnum('MEDIUM', validSizes);
console.log(size); // 'medium'

// Handle invalid values with defaults
const priority = toEnum('urgent', ['low', 'high'], 'low');
console.log(priority); // 'low' (fallback)
```

## API

### `toEnum(value, enumSet, defaultValue)`

**Parameters:**
- `value` (any): The value to convert and validate against the enum set
- `enumSet` (Array): Array of valid enum values (strings)
- `defaultValue` (string, optional): Fallback value if conversion fails

**Returns:** 
- `string`: Valid enum value from the set
- `defaultValue`: If provided and conversion fails
- `undefined`: If no default provided and conversion fails

**Features:**
- **Case-Insensitive Matching**: Automatically handles case variations
- **Flexible Input Types**: Accepts strings, numbers, and other types
- **Default Value Support**: Graceful fallback for invalid inputs
- **Type Safety**: Ensures output is always from the valid enum set

## Use Cases

### Configuration Validation
```javascript
// Validate environment settings
const logLevel = toEnum(process.env.LOG_LEVEL, ['debug', 'info', 'warn', 'error'], 'info');

// Validate user preferences
const theme = toEnum(userSettings.theme, ['light', 'dark', 'auto'], 'auto');
```

### API Parameter Handling
```javascript
// Validate API request parameters
const sortOrder = toEnum(req.query.sort, ['asc', 'desc'], 'asc');
const status = toEnum(req.body.status, ['active', 'inactive', 'pending']);
```

### User Interface Controls
```javascript
// Validate dropdown selections
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
```

## Related Modules

- [`to-bool`](../to-bool/) - Boolean conversion with intelligent parsing
- [`to-number`](../to-number/) - Numeric conversion from various formats
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