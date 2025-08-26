# Central Tendency Chain Analysis

## Test Focus
- Show AI inputs and outputs from centrality evaluations  
- List all prompts in the module
- Show LLM performance metrics
- Analyze the central tendency prompt
- Analyze the calculateMedian function

## Reference Modules
- src/verblets/central-tendency-lines

## Module Notes
This chain calculates statistical central tendency (mean, median, mode) for arrays of numbers.
Key areas of interest:
- LLM prompt efficiency for statistical calculations
- Handling of edge cases (empty arrays, non-numeric values)
- Performance characteristics with large datasets

## Test Coverage Focus
- Verify median calculation for odd/even length arrays
- Test mode detection with multiple modes
- Edge cases: empty arrays, single values, all same values