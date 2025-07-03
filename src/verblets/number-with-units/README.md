# number-with-units

Extract numeric values and their associated units from text input using AI-powered analysis.

## Basic Usage

```javascript
import numberWithUnits from './index.js';

// Extract number and unit from text
const result = await numberWithUnits('How much does 2.5 kilograms weigh?');
// => { value: 2.5, unit: 'kilograms' }

const result2 = await numberWithUnits('The temperature is 98.6 degrees Fahrenheit');
// => { value: 98.6, unit: 'degrees Fahrenheit' }
```

## Parameters

- **text** (string): The text to analyze for numeric values and units
- **config** (Object, optional): Configuration options
  - **llm** (string|Object): LLM model configuration (default: 'fastGoodCheap')

## Return Value

Returns an object with:
- **value** (number|null): The extracted numeric value, or null if not determinable
- **unit** (string|undefined): The identified unit of measurement

## Use Cases

- **Form Processing**: Extract measurements from user input
- **Data Extraction**: Parse numeric data from documents or text
- **Recipe Analysis**: Extract quantities and units from cooking instructions
- **Scientific Data**: Process measurement data from research papers
- **Inventory Management**: Parse product specifications with quantities
- **Medical Records**: Extract dosages and measurements from clinical notes

## Examples

```javascript
// Temperature measurements
await numberWithUnits('Set the oven to 350 degrees');
// => { value: 350, unit: 'degrees' }

// Distance and length
await numberWithUnits('The race is 26.2 miles long');
// => { value: 26.2, unit: 'miles' }

// Weight and mass
await numberWithUnits('Add 500 grams of flour');
// => { value: 500, unit: 'grams' }

// Volume measurements
await numberWithUnits('Pour 2 cups of water');
// => { value: 2, unit: 'cups' }

// Time durations
await numberWithUnits('Cook for 45 minutes');
// => { value: 45, unit: 'minutes' }

// Questions without specific values
await numberWithUnits('How many liters should I use?');
// => { value: null, unit: 'liters' }

// Complex measurements
await numberWithUnits('The dosage is 10mg per kilogram of body weight');
// => { value: 10, unit: 'mg per kilogram' }
```

## Advanced Usage

```javascript
// Custom LLM configuration
const result = await numberWithUnits(
  'The pressure is 14.7 psi at sea level',
  { 
    llm: {
      modelName: 'gpt-4',
      temperature: 0.1
    }
  }
);

// Batch processing
const texts = [
  'Add 3 tablespoons of oil',
  'Heat to 180 celsius',
  'Wait for 30 seconds'
];

const results = await Promise.all(
  texts.map(text => numberWithUnits(text))
);
```

## Supported Unit Types

The function can identify various types of units:
- **Weight/Mass**: grams, kilograms, pounds, ounces, tons
- **Length/Distance**: meters, kilometers, feet, inches, miles
- **Volume**: liters, milliliters, cups, gallons, quarts
- **Temperature**: celsius, fahrenheit, kelvin
- **Time**: seconds, minutes, hours, days, weeks
- **Pressure**: psi, bar, pascals, atmospheres
- **Speed**: mph, km/h, m/s
- **Energy**: joules, calories, watts, BTU
- **And many more measurement types

## Error Handling

- Returns `{ value: null, unit: undefined }` for text without measurable quantities
- Handles ambiguous or incomplete measurements gracefully
- Uses structured JSON schema validation for consistent output format
- Falls back to safe defaults when parsing fails 