# Boolean Conversion Utility

A utility function for converting various input types to boolean values with intelligent parsing.

## Purpose

The `to-bool` utility provides robust boolean conversion that handles:
- String representations ("true", "false", "yes", "no", etc.)
- Numeric values (0, 1, non-zero numbers)
- Existing boolean values
- Null and undefined values

## Features

- **Flexible Input**: Accepts strings, numbers, booleans, and null/undefined
- **Intelligent Parsing**: Recognizes common boolean representations
- **Case Insensitive**: Handles various capitalizations
- **Predictable Output**: Consistent boolean conversion rules

## Usage

Used throughout the library for normalizing boolean values from various sources like configuration files, user input, and API responses. 