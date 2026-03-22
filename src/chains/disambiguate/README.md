# disambiguate

Resolve ambiguous terms and phrases in text using AI-powered analysis with contextual understanding and intelligent clarification.

## Usage

```javascript
import disambiguate from './index.js';

const text = "The bank was steep and the interest rate was high.";
const clarified = await disambiguate(text, 'clarify ambiguous terms');

// Returns: "The riverbank was steep and the loan interest rate was high."
```

## API

### `disambiguate(text, instructions, config)`

**Parameters:**
- `text` (string): Text containing ambiguous terms
- `instructions` (string): Natural language description of how to disambiguate
- `config` (Object): Configuration options
  - `preserveOriginal` (boolean): Keep original text structure (default: true)
  - `highlightChanges` (boolean): Mark disambiguated terms (default: false)
  - `contextWindow` (number): Context size for analysis (default: 50)
  - `llm` (Object): LLM model options

**Returns:** Promise<string> - Disambiguated text with clarified terms

## Features

- **Context-Aware Analysis**: Uses surrounding text to determine correct meaning
- **Intelligent Clarification**: Resolves ambiguity while preserving original intent
- **Flexible Processing**: Handles various types of ambiguity (lexical, syntactic, semantic)
- **Structure Preservation**: Maintains original text formatting and flow
- **Configurable Highlighting**: Optional marking of disambiguated terms

## Use Cases

### Technical Documentation
```javascript
import disambiguate from './index.js';

const technical = "The application crashed when the memory was full.";
const clarified = await disambiguate(technical, 'clarify technical terms');

// Returns: "The software application crashed when the computer memory was full."
```

### Legal Document Processing
```javascript
const legal = "The party shall provide notice to the other party.";
const clarified = await disambiguate(legal, 'specify which parties in contract context');

// Returns: "The contracting party shall provide notice to the other contracting party."
```

### Academic Text Analysis
```javascript
const academic = "The study examined the relationship between variables.";
const clarified = await disambiguate(academic, 'specify the research variables');

// Returns: "The study examined the relationship between the independent and dependent variables."
```
