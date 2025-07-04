# to-object - JSON repair and validation

This module is designed to take JSON results from ChatGPT calls, which can often be imperfect or malformed, and repair them to create valid JSON. If a JSON Schema is provided, the module also validates the repaired JSON against it. This process ensures that the JSON data is both well-formed and conforms to the expected structure.

## Usage

The primary function exported by this module takes two arguments: a text string to be parsed into JSON, and an optional schema object which describes the expected format of the JSON data.

Here is an example of how to use the module:
```javascript
import toObject from './path/to/module';

const text = '...';  // JSON string returned from a ChatGPT call
const schema = { ... };  // Optional JSON Schema

try {
  const result = await toObject(text, schema);
  console.error(result);  // Repaired and validated JSON
} catch (error) {
  console.error(error);  // Validation message if JSON doesn't meet the schema
}
```
