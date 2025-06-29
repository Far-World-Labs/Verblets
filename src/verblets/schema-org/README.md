# Schema.org Verblet

Convert natural language content into structured Schema.org objects using AI-powered semantic understanding. This verblet identifies entities, relationships, and properties to create valid Schema.org markup for improved SEO and semantic web compatibility.

## Usage

```javascript
import schemaOrg from './index.js';

await schemaOrg("John Smith is a software engineer at TechCorp in San Francisco", "Person");
// Returns Schema.org Person object with name, jobTitle, worksFor, etc.

await schemaOrg("Amazing Italian restaurant downtown with 5-star reviews", "LocalBusiness");  
// Returns Schema.org LocalBusiness object with cuisine, location, rating, etc.
```

## API Reference

### `schemaOrg(text, schemaType, config = {})`

Analyzes natural language text and extracts structured data conforming to Schema.org specifications.

**Parameters**

- `text` (string): The natural language content to analyze and structure
- `schemaType` (string): The target Schema.org type (e.g., "Person", "LocalBusiness", "Event")  
- `config` (object, optional): Configuration options including LLM settings

**Returns**

- `Promise<object>`: A promise that resolves to a structured object following Schema.org specifications for the specified type

**Examples**

See [example.js](./example.js) for comprehensive usage examples and real-world scenarios. 