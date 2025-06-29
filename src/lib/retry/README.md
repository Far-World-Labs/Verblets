# Retry Utility

A robust retry mechanism for handling transient failures in operations.

## Purpose

The retry utility provides:
- Configurable retry attempts with exponential backoff
- Error filtering to determine which errors should trigger retries
- Timeout handling and cancellation support
- Detailed logging of retry attempts

## Features

- **Exponential Backoff**: Intelligent delay between retry attempts
- **Error Filtering**: Only retry on specific error types
- **Timeout Support**: Respect overall operation timeouts
- **Cancellation**: Support for aborting retry operations

## Usage

Used internally by API clients and other operations that may experience transient failures, such as network requests or external service calls. 