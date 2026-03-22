# date

Extract and normalize dates from text using AI-powered parsing with intelligent format recognition and contextual understanding.

## Usage

```javascript
import date from './index.js';

const text = "The project deadline is next Friday, and the final review is scheduled for March 15th.";
const dates = await date(text, 'extract all mentioned dates');

// Returns: [
//   { date: '2024-01-19', original: 'next Friday', type: 'relative' },
//   { date: '2024-03-15', original: 'March 15th', type: 'absolute' }
// ]
```

## API

### `date(text, instructions, config)`

**Parameters:**
- `text` (string): Text containing dates to extract
- `instructions` (string): Natural language description of what dates to find
- `config` (Object): Configuration options
  - `format` (string): Output date format (default: 'YYYY-MM-DD')
  - `timezone` (string): Timezone for relative dates (default: 'UTC')
  - `includeTime` (boolean): Include time information (default: false)
  - `llm` (Object): LLM model options

**Returns:** Promise<Array<Object>> - Array of extracted dates with structure:
```javascript
{
  date: string,      // Normalized date
  original: string,  // Original text
  type: string,      // 'absolute' or 'relative'
  confidence: number // Confidence score (0-1)
}
```

## Features

- **Intelligent Format Recognition**: Handles various date formats and representations
- **Relative Date Processing**: Converts relative dates like "next week" to absolute dates
- **Context-Aware Extraction**: Uses surrounding text to disambiguate dates
- **Flexible Output Formats**: Supports multiple date format options
- **Confidence Scoring**: Provides reliability scores for extracted dates
- **Timezone Support**: Handles timezone-aware date processing

## Use Cases

### Document Processing
```javascript
import date from './index.js';

const contract = "This agreement is effective from January 1, 2024, and expires on December 31, 2025.";
const contractDates = await date(contract, 'find contract effective and expiration dates');

// Returns structured date information for legal document processing
```

### Event Planning
```javascript
const email = "Let's meet next Tuesday at 3 PM, and follow up the week after.";
const meetingDates = await date(email, 'extract meeting and follow-up dates', { 
  includeTime: true,
  timezone: 'America/New_York'
});

// Returns dates with time information for calendar integration
```

### Content Analysis
```javascript
const article = "The study was conducted from March 2023 to September 2023, with preliminary results published last month.";
const studyDates = await date(article, 'find study timeline dates');

// Returns research timeline dates for academic analysis
```
