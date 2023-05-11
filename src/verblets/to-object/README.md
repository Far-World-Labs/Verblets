# JSON Validator Module

This JavaScript module is designed to validate JSON data against provided JSON Schemas. It makes use of the [Ajv](https://ajv.js.org/) library for schema validation and [chatGPT](https://github.com/openai/gpt-3) to handle error prompts.

## Features

- Validate JSON data against JSON schemas.
- Provide detailed error logs when JSON parsing or validation fails.
- Retry JSON parsing and validation with chatGPT when an error occurs.
- Custom ValidationError class for detailed error handling.

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

const text = '{"key": "value"}';
const schema = {
  type: 'object',
  properties: { key: { type: 'string' } },
  required: ['key'],
};

try {
  const result = await toObject(text, schema);
  console.log(result);
} catch (error) {
  console.error(error);
}
```
