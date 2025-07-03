# Command Patterns - Good vs. Stalling

This document tracks command patterns that work efficiently vs. those that cause stalls or hangs.

## ❌ STALLING/HANGING COMMANDS

### Pattern: Complex grep with pipes and head/tail
```bash
# STALLS - Complex grep with multiple pipes
source .env && npm run examples 2>&1 | grep -E "×|failed|Failed" | head -20
```
**Issue**: Complex piping with grep patterns and head/tail can cause hangs
**Date**: 2024-12-19
**Context**: Trying to filter test output for failures

### Pattern: Nested pipes with complex regex
```bash
# STALLS - Multiple pipes with regex
source .env && timeout 300s npm run examples 2>&1 | grep -E "(Test Files|Tests|failed|passed)" | tail -10
```
**Issue**: Complex regex patterns with multiple pipes cause timeouts
**Date**: 2024-12-19
**Context**: Attempting to get test summary

### Pattern: File output with npm run examples
```bash
# STALLS - File output redirection with examples
source .env && timeout 300s npm run examples > /tmp/examples-output.txt 2>&1
```
**Issue**: Even simple file redirection with npm run examples hangs/stalls
**Date**: 2024-12-19
**Context**: Attempting to capture examples output to file for safe processing

## ✅ WORKING COMMANDS

### Pattern: Simple direct output
```bash
# WORKS - Direct command output
source .env && npm run examples
```
**Success**: Direct command execution without complex piping
**Date**: 2024-12-19

### Pattern: Simple timeout with basic redirection
```bash
# WORKS - Basic timeout and redirection
source .env && timeout 60s npm run examples 2>&1
```
**Success**: Simple timeout with stderr redirection works well
**Date**: 2024-12-19

### Pattern: Single pipe with simple grep
```bash
# WORKS - Single pipe with simple pattern
source .env && npm run examples | grep "failed"
```
**Success**: Single pipe with simple grep pattern
**Date**: 2024-12-19

### Pattern: Specific test targeting
```bash
# WORKS - Target specific test files
export $(cat .env | grep -v '^#' | xargs) && npx vitest --config .vitest.config.examples.js --run src/chains/specific/index.examples.js
```
**Success**: Running specific test files instead of full suite
**Date**: 2024-12-19

### Pattern: File-based output capture (non-examples)
```bash
# WORKS - Write to file then read (NOT with npm run examples)
command > /tmp/test-output.txt 2>&1
cat /tmp/test-output.txt | tail -20
```
**Success**: Write output to file first, then process (avoid with npm run examples)
**Date**: 2024-12-19

## RECOMMENDED TIMEOUT VALUES

### Testing & Debugging
- **Quick tests**: `timeout 30s` - For fast feedback during debugging
- **Single file tests**: `timeout 60s` - For individual test file execution
- **Unit tests**: `timeout 120s` - For npm test runs

### Examples & Integration Tests  
- **Short examples**: `timeout 300s` (5 minutes) - For limited example runs
- **Full examples**: `timeout 600s` (10 minutes) - For complete example suites
- **Long examples**: `timeout 900s` (15 minutes) - Maximum recommended timeout

### Emergency Patterns
- **Status checks**: `timeout 10s` - For quick system status
- **File operations**: `timeout 30s` - For file system operations

## GUIDELINES

### Safe Command Patterns
1. **Avoid complex piping**: Use single pipes when possible
2. **Avoid nested regex**: Keep grep patterns simple
3. **Use specific test targeting**: Run individual test files instead of full suite
4. **Use appropriate timeouts**: Match timeout to expected execution time
5. **Test incrementally**: Start with simple commands, add complexity gradually
6. **Prefer file-based processing**: For complex operations (except npm run examples)

### Timeout Strategy
1. **Start short**: Begin with 30-60s timeouts for testing
2. **Scale appropriately**: Use longer timeouts only when needed
3. **Monitor performance**: Track which operations need longer timeouts
4. **Emergency fallback**: Always have a shorter timeout alternative

### Troubleshooting Hangs
1. **Reduce timeout**: Start with 30s to quickly identify hangs
2. **Simplify pipes**: Remove complex pipe chains
3. **Target specific files**: Use individual test files instead of full suite
4. **Use intermediate files**: Break complex operations into steps
5. **Check regex**: Simplify grep patterns

## COMMAND ALTERNATIVES

### Instead of complex grep chains:
```bash
# BAD
command | grep -E "pattern1|pattern2" | head -10

# GOOD
command > /tmp/output.txt
grep "pattern1" /tmp/output.txt
grep "pattern2" /tmp/output.txt
```

### Instead of full test suite:
```bash
# BAD (slow/hangs)
npm run examples

# GOOD (targeted)
npx vitest --config .vitest.config.examples.js --run src/chains/specific/index.examples.js
```

### Instead of multiple pipes:
```bash
# BAD  
command | pipe1 | pipe2 | pipe3

# GOOD
command > /tmp/step1.txt
pipe1 < /tmp/step1.txt > /tmp/step2.txt
pipe2 < /tmp/step2.txt
```

### Timeout Examples by Use Case:
```bash
# Quick status check
timeout 30s npm run lint

# Single test file
timeout 60s npx vitest --run specific-file.test.js

# Limited examples
timeout 300s npx vitest --config .vitest.config.examples.js --run src/chains/conversation/

# Full examples (if necessary)
timeout 600s npm run examples
``` 