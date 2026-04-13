import { asXML } from '../../prompts/wrap-variable.js';

/**
 * Disambiguate (instructions, config) when instructions is optional.
 *
 * When a chain's signature is `fn(input, instructions?, config?)`, callers
 * must pass `undefined` to skip instructions: `fn(input, undefined, { chunkSize: 500 })`.
 *
 * This function detects when an object without `text` (and without `.build`)
 * was passed as instructions and shifts it to config, so callers can write
 * `fn(input, { chunkSize: 500 })` directly.
 *
 * When `knownKeys` is provided, an object containing any known instruction key
 * is treated as instructions even without `text`. This handles bundles like
 * `{ vocabulary: v }` or `{ spec: s }` that carry domain data without free-text.
 *
 * @param {*} instructions - Second positional argument
 * @param {object} [config] - Third positional argument
 * @param {string[]} [knownKeys] - Keys that signal an instruction bundle
 * @returns {[instructions: *, config: object]}
 */
export function resolveArgs(instructions, config, knownKeys) {
  if (instructions === null) {
    throw new Error('Instructions must be a string, object, or undefined — null is not allowed');
  }
  if (
    config === undefined &&
    instructions !== undefined &&
    typeof instructions === 'object' &&
    !Array.isArray(instructions) &&
    !('text' in instructions) &&
    !('build' in instructions) &&
    !(knownKeys && knownKeys.some((k) => k in instructions))
  ) {
    return [undefined, instructions];
  }
  return [instructions, config ?? {}];
}

/**
 * Normalize an instruction parameter to { text, ...keys } form.
 * Accepts:
 *   - string → { text: string }
 *   - template builder (has .build()) → { text: renderedString }
 *   - object with text property → passthrough
 *
 * @param {string|object} instruction
 * @returns {{ text: string, [key: string]: * }}
 */
export function normalizeInstruction(instruction) {
  if (instruction === null) {
    throw new Error('Instructions must be a string, object, or undefined — null is not allowed');
  }
  if (instruction === undefined) return { text: undefined };
  if (typeof instruction === 'string') return { text: instruction };
  if (instruction?.build) return { text: instruction.build() };
  return instruction;
}

/**
 * Resolve a value to a string, handling builders, objects, and primitives.
 * @param {*} value
 * @returns {string}
 */
function resolveValue(value) {
  if (value?.build) return value.build();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Resolve an instruction into text, known-key values, and assembled context XML.
 *
 * Known keys are extracted by name — the chain uses them to override internal
 * derivation (e.g. supplying 'spec' skips spec generation).
 *
 * Unknown keys become XML context blocks joined into a single string,
 * prepended to the chain's core prompt. Array values of {name, text}
 * objects produce nested XML: `<key><name>text</name>...</key>`.
 *
 * Template builder values (.build method) are rendered automatically.
 * Object values are JSON-serialized (not toString'd).
 *
 * @param {string|object} instruction - Raw instruction (string or object)
 * @param {string[]} knownKeys - Keys the chain recognizes internally
 * @returns {{ text: string, known: Record<string, *>, context: string }}
 */
export function resolveTexts(instruction, knownKeys = []) {
  const { text, ...rest } = normalizeInstruction(instruction);
  const knownSet = new Set(knownKeys);
  const known = {};
  const contextParts = [];

  for (const [key, value] of Object.entries(rest)) {
    if (knownSet.has(key)) {
      known[key] = value?.build ? value.build() : value;
    } else if (Array.isArray(value) && value.length > 0 && value[0]?.name !== undefined) {
      // Name-text pairs → nested XML: [{name, text}, ...] → <key><name>text</name>...</key>
      const inner = value.map((pair) => asXML(pair.text, { tag: pair.name })).join('\n');
      contextParts.push(asXML(inner, { tag: key }));
    } else {
      contextParts.push(asXML(resolveValue(value), { tag: key }));
    }
  }

  return { text, known, context: contextParts.join('\n\n') };
}
