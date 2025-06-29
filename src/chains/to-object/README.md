# to-object - JSON repair and validation

This module is designed to take JSON results from ChatGPT calls, which can often be imperfect or malformed, and repair them to create valid JSON. If a JSON Schema is provided, the module also validates the repaired JSON against it. This process ensures that the JSON data is both well-formed and conforms to the expected structure.

## Features

- Automatic repair of malformed JSON data returned by ChatGPT.
- Validation of repaired JSON data against provided JSON Schemas using the [Ajv](https://ajv.js.org/) library.
- Recursive repair attempts through internal calls to ChatGPT for particularly stubborn cases.
- Detailed error handling and validation messages
- Custom ValidationError class for understanding where the returned JSON fails to meet the schema.

## Installation

This module is part of a larger project and is not designed to be installed standalone. However, you can copy the module into your own project and install the necessary dependencies via npm or yarn:

```bash
npm install ajv
```

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
