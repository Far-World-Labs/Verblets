# Logger Service

A centralized logging service that provides consistent logging across the entire library.

## Purpose

The logger service offers:
- Structured logging with multiple levels (debug, info, warn, error)
- Configurable output formats and destinations
- Context-aware logging with request/operation tracking
- Performance monitoring and metrics collection

## Features

- **Multiple Log Levels**: Debug, info, warning, error, and fatal levels
- **Structured Output**: JSON-formatted logs for easy parsing
- **Context Tracking**: Associate logs with specific operations or requests
- **Configurable**: Adjust logging behavior based on environment

## Usage

Used throughout the library to provide consistent logging and debugging information. Helps with troubleshooting and monitoring library operations. 