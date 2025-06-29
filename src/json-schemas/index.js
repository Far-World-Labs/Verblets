import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * JSON Schema collection for structured LLM responses.
 *
 * This module provides access to predefined JSON schemas used throughout
 * the verblets library for constraining LLM outputs and ensuring reliable
 * data structures in responses.
 */

/**
 * Safely read and parse a JSON schema file
 * @param {string} filename - Name of the schema file (without extension)
 * @returns {Object} Parsed JSON schema object
 * @throws {Error} If file cannot be read or parsed
 */
function readSchema(filename) {
  try {
    const filePath = path.join(__dirname, `${filename}.json`);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read schema '${filename}': ${error.message}`);
  }
}

// Core schemas for verblet responses
export const intentResult = readSchema('intent-result');
export const archResult = readSchema('arch-result');
export const expectResult = readSchema('expect-result');
export const scoreResult = readSchema('score-result');

// Export all schemas as a collection for convenience
export const schemas = {
  intentResult,
  archResult,
  expectResult,
  scoreResult,
};
