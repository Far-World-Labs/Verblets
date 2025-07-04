# veiled-variants

Generate alternative versions of sensitive text that maintain meaning while obscuring identifying details using privacy-preserving transformations.

## Usage

```javascript
import veiledVariants from './index.js';

const sensitive = "John Smith from Acme Corp called about the merger with TechStart Inc.";
const variants = await veiledVariants(sensitive, 'business communication', { count: 3 });

// Returns:
// [
//   "A representative from a major corporation called about the acquisition with a startup company.",
//   "The business contact discussed the potential partnership with the technology firm.",
//   "An executive from the established company mentioned the deal with the emerging business."
// ]
```

## API

### `veiledVariants(text, context, config)`

**Parameters:**
- `text` (string): Sensitive text to transform
- `context` (string): Context description for appropriate transformation
- `config` (Object): Configuration options
  - `count` (number): Number of variants to generate (default: 3)
  - `preserveStructure` (boolean): Keep original sentence structure (default: true)
  - `llm` (Object): LLM model options (automatically uses privacy model)

**Returns:** Promise<Array<string>> - Array of privacy-preserving variants

## Privacy Model

This function automatically uses privacy-preserving models for all transformations, ensuring sensitive data never leaves your secure environment.

## Use Cases

### Legal Document Processing
```javascript
import veiledVariants from './index.js';

const legal = "The plaintiff, Maria Rodriguez, filed suit against XYZ Medical Center on March 15, 2023.";
const variants = await veiledVariants(legal, 'legal proceedings', { count: 2 });

// Returns anonymized versions suitable for case studies or training
```

### Customer Support Analysis
```javascript
const complaint = "Customer Jane Doe from email jane@example.com complained about delayed delivery to 123 Main St.";
const anonymous = await veiledVariants(complaint, 'customer service', { count: 1 });

// Returns versions with identifying details obscured for analysis
```

## Features

- **Automatic Privacy Protection**: Uses privacy-preserving models exclusively
- **Context-Aware Transformation**: Maintains appropriate tone and meaning for the domain
- **Flexible Anonymization**: Generates multiple variants with different levels of abstraction
- **Structure Preservation**: Optionally maintains original sentence and paragraph structure
- **Comprehensive Coverage**: Handles names, locations, organizations, dates, and other identifiers
