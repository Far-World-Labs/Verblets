# scan-js

**Internal code analysis tool.** This module scans JavaScript codebases and analyzes functions for various code quality features like maintainability, complexity, and patterns. It's primarily used internally for code analysis tasks.

## Purpose

This tool traverses JavaScript files in a codebase, identifies functions, and uses AI to analyze them based on selected code quality criteria. It's designed for automated code review and quality assessment.

## Internal Architecture

The module:
1. Uses the search-js-files library to traverse and parse JavaScript code
2. Identifies functions and their boundaries within files
3. Selects relevant code quality criteria using the sort chain
4. Analyzes each function using AI against the selected criteria
5. Outputs results with file paths and analysis scores

## Features Analyzed

The tool can analyze various code features including:
- Maintainability
- Complexity
- Code patterns
- Documentation quality
- Testing considerations
- Performance characteristics

## Technical Details

- Uses AST traversal to find functions
- Supports configurable feature selection
- Provides abbreviated path aliases for readability
- Handles retry logic for API calls
- Outputs progress to stderr during scanning

## Note

This is an internal utility module used for code analysis tasks within the verblets ecosystem. It's not intended for direct use in applications.