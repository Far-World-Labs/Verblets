# Date Conversion Utility

A utility for converting various input formats to JavaScript Date objects with intelligent parsing.

## Purpose

The `to-date` utility handles:
- String date parsing in multiple formats
- Unix timestamp conversion
- ISO date string processing
- Null and undefined value handling

## Features

- **Multiple Formats**: Supports various date string formats
- **Timezone Aware**: Handles timezone information appropriately
- **Error Handling**: Graceful handling of invalid date inputs
- **Consistent Output**: Always returns Date objects or null

## Usage

Used throughout the library for normalizing date values from various sources like user input, configuration files, and API responses. 