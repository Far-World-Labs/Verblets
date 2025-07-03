# Cursor Rules - Command Execution

## Terminal Command Guidelines

### ❌ AVOID - Commands That Stall
- Complex pipe chains: `command | grep -E "pattern1|pattern2" | head -10`
- Multiple pipes with regex: `command | pipe1 | pipe2 | pipe3`
- Nested grep with head/tail: `grep pattern | head | tail`
- Complex regex patterns in pipes: `grep -E "(complex|regex|pattern)"`
- **File redirection with npm run examples**: `npm run examples > /tmp/file.txt 2>&1`

### ✅ PREFER - Safe Command Patterns
- Direct command execution: `npm run examples` (but may be long-running)
- Simple timeout with redirection: `timeout 20s command 2>&1`
- File-based processing: `command > /tmp/file.txt && cat /tmp/file.txt` (but NOT with npm run examples)
- Single pipe with simple patterns: `command | grep "simple"`
- Step-by-step processing using intermediate files
- **Specific test runs**: `npx vitest --run specific-file.js`

### Command Execution Strategy
1. **Start simple**: Begin with direct command execution
2. **Add complexity gradually**: Test each pipe/filter individually
3. **Use timeouts**: Always include timeout for long-running commands
4. **Break down complex operations**: Use intermediate files for multi-step processing
5. **Test patterns**: Verify grep patterns work before adding to pipes
6. **Target specific tests**: Use specific test files instead of full suite when debugging

### File-Based Processing Template
```bash
# Instead of: command | complex | pipe | chain
# Use this pattern:
command > /tmp/step1.txt 2>&1
grep "pattern" /tmp/step1.txt > /tmp/step2.txt
head -20 /tmp/step2.txt

# BUT AVOID with npm run examples - it hangs
```

### Safe Timeout Values
- Testing/debugging: 20s
- Examples/tests: 300-600 seconds (5-10 minutes)
- Long operations: 900 seconds (15 minutes) max

### Examples-Specific Patterns
- **AVOID**: `npm run examples > file.txt` (hangs)
- **PREFER**: `npx vitest --config .vitest.config.examples.js --run src/chains/specific/`
- **PREFER**: `source .env && npx vitest --run single-file.examples.js`
- **PREFER**: Check individual test files for issues 