# Intersections Chain

The intersections chain finds comprehensive intersections for all combinations of items, ensuring consistent and exhaustive results through example-driven improvement with built-in quality validation.

## Real-World Example: Planning a Perfect Weekend

Imagine you're planning activities that work for different groups of people. Let's find intersections between "outdoor enthusiasts", "food lovers", and "budget-conscious friends":

```javascript
import intersections from './index.js';

const result = await intersections([
  'outdoor enthusiasts', 
  'food lovers', 
  'budget-conscious friends'
]);

console.log(result);
```

**Sample Output:**
```javascript
{
  "outdoor enthusiasts + food lovers": {
    combination: ["outdoor enthusiasts", "food lovers"],
    description: "Activities that combine outdoor adventure with culinary experiences",
    elements: [
      "camping with gourmet cooking",
      "food truck festivals in parks",
      "farmers market visits",
      "outdoor barbecue competitions",
      "hiking to scenic picnic spots",
      "beach cookouts",
      "food foraging tours"
    ]
  },
  "outdoor enthusiasts + budget-conscious friends": {
    combination: ["outdoor enthusiasts", "budget-conscious friends"],
    description: "Affordable outdoor activities that don't break the bank",
    elements: [
      "free hiking trails",
      "public beach visits",
      "city park activities",
      "free outdoor concerts",
      "community garden volunteering",
      "geocaching adventures",
      "sunset watching spots"
    ]
  },
  "food lovers + budget-conscious friends": {
    combination: ["food lovers", "budget-conscious friends"],
    description: "Delicious food experiences that are wallet-friendly",
    elements: [
      "happy hour specials",
      "food truck meals",
      "potluck dinner parties",
      "cooking classes at community centers",
      "ethnic food markets",
      "restaurant week deals",
      "home cooking challenges"
    ]
  },
  "outdoor enthusiasts + food lovers + budget-conscious friends": {
    combination: ["outdoor enthusiasts", "food lovers", "budget-conscious friends"],
    description: "Perfect activities that satisfy adventure, food, and budget needs",
    elements: [
      "picnic in free parks with homemade food",
      "food truck festivals in public spaces",
      "community garden potlucks",
      "beach barbecues with shared costs",
      "hiking with packed gourmet sandwiches",
      "free outdoor farmers markets"
    ]
  }
}
```

## How it Works

1. **Generate Combinations** - Creates all possible combinations of the input items (including single items)
2. **Shuffle & Score** - Randomly orders combinations and uses AI to score quality (1-10 scale)
3. **Find Best Examples** - Identifies the first 3 combinations that score above the threshold
4. **Validate Examples** - Ensures the top examples are high-quality intersections
5. **Improve All Results** - Uses the best examples as patterns to enhance all intersection results
6. **Error Handling** - Throws an error if no combinations meet the quality threshold

This approach finds good examples organically, uses them to improve the quality of all results, and validates quality at key checkpoints.

## API Reference

### `intersections(items, options)`

**Parameters:**
- `items` (Array): Array of items to find intersections between
- `options` (Object, optional): Configuration options
  - `instructions` (string): Custom instructions for intersection finding
  - `minSize` (number, default: 1): Minimum combination size
  - `maxSize` (number, default: items.length): Maximum combination size  
  - `batchSize` (number, default: 5): Number of combinations to process in parallel
  - `goodnessScore` (number, default: 7): Minimum score threshold for good examples (1-10 scale)

**Returns:** Object with intersection results

**Throws:** Error when no combinations score above the goodness threshold

### Usage Examples

```javascript
// Basic usage
const results = await intersections(['cats', 'dogs', 'birds']);

// Custom configuration
const results = await intersections(['hiking', 'photography', 'meditation'], {
  instructions: 'Focus on peaceful, mindful activities',
  batchSize: 10,        // Process more combinations in parallel
  goodnessScore: 8,     // Higher quality threshold
  minSize: 2,           // Only combinations of 2+ items
  maxSize: 3            // Maximum 3 items per combination
});

// Error handling
try {
  const results = await intersections(['incompatible', 'categories'], {
    goodnessScore: 9  // Very high threshold
  });
} catch (error) {
  console.log(error.message); 
  // "No intersections found with score above 9. Consider lowering the goodnessScore threshold or improving input quality."
}
```

## Configuration Tips

- **Lower `goodnessScore`** (5-6) for more permissive quality standards
- **Higher `goodnessScore`** (8-9) for stricter quality requirements  
- **Increase `batchSize`** (10-15) for faster processing with good API limits
- **Decrease `batchSize`** (2-3) to be gentler on API rate limits
- **Use `instructions`** to guide the AI toward specific types of intersections

## Quality Assurance

The chain includes built-in quality validation:

- **Example Validation**: Ensures the top 3 examples have meaningful descriptions, good element counts, and represent quality intersections
- **Error Handling**: Throws descriptive errors when quality thresholds aren't met
- **Parallel Processing**: Efficiently processes combinations in configurable batches

The system learns from its best results and applies those patterns to enhance the quality of all intersections, moving away from predefined categorization methods.

## Usage

```javascript
