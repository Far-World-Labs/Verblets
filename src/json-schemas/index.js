/**
 * JSON Schema collection for structured LLM responses.
 *
 * This module provides access to predefined JSON schemas used throughout
 * the verblets library for constraining LLM outputs and ensuring reliable
 * data structures in responses.
 */

import intentResult from './intent-result.json';
import intent from './intent.json';
import archResult from './arch-result.json';
import expectResult from './expect-result.json';
import scoreResult from './score-result.json';
import schemaDotOrgPhotograph from './schema-dot-org-photograph.json';
import schemaDotOrgPlace from './schema-dot-org-place.json';

export {
  intentResult,
  intent,
  archResult,
  expectResult,
  scoreResult,
  schemaDotOrgPhotograph,
  schemaDotOrgPlace,
};

export const schemas = {
  intentResult,
  intent,
  archResult,
  expectResult,
  scoreResult,
  schemaDotOrgPhotograph,
  schemaDotOrgPlace,
};

export const schemaOrgSchemas = {
  photograph: schemaDotOrgPhotograph,
  place: schemaDotOrgPlace,
};
