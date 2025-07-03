# json-schemas

JSON Schema definitions for validating and shaping structured LLM output across verblets and chains.

## Overview

This directory contains reusable JSON schemas that define expected data structures for language model responses. Schemas ensure consistent output format and enable validation of AI-generated content.

## Basic Usage

```javascript
import { schemas } from './index.js';

// Use schema for validation in a verblet
const result = await someVerblet(input, {
  schema: schemas.intent,
  validate: true
});

// Schema ensures structured output matches expected format
```

## Available Schemas

- **`intent.json`**: User intent classification with parameters
- **`cars-test.json`**: Vehicle information structure for testing
- **`schema-dot-org-photograph.json`**: Schema.org compliant photo metadata
- **`schema-dot-org-place.json`**: Schema.org compliant location data

## Schema Helper

The [`index.js`](./index.js) file provides convenient access to commonly used schemas:

```javascript
import { schemas } from './index.js';
// Access schemas by name without individual imports
```

## Integration

Schemas integrate with:
- **Verblets**: For output validation and structure enforcement
- **Chains**: For batch processing with consistent data formats
- **Auto verblet**: For dynamic tool schema generation

## Custom Schemas

Additional schemas may be co-located with their modules in `../verblets` or `../chains` directories when they are module-specific rather than shared resources.
