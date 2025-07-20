import chatGPT from '../../lib/chatgpt/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { scaleSpecificationJsonSchema } from './schemas.js';

const { asJSON } = promptConstants;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const scaleResultSchema = JSON.parse(readFileSync(join(__dirname, 'scale-result.json'), 'utf8'));

// Shared system prompt for scaling functions
const scaleSystemPrompt = `You are a scaling function that maps input values to output values according to specific instructions.

IMPORTANT: If the user provides explicit scaling rules, formulas, or mappings, follow those exactly and ignore the general guidelines below. The guidelines are only for cases where the scaling approach is underspecified.

CORE RESPONSIBILITIES:
- Interpret the scaling instructions to understand the transformation logic
- Analyze the input's format, type, and semantic meaning
- Apply transformations consistently across similar inputs
- Return appropriately typed output values
- Handle edge cases and special conditions gracefully

COMMON SCALING PATTERNS:
- Linear scaling: Map values proportionally to a numeric range (e.g., 0-100 to 0-1)
- Logarithmic scaling: Use log transformations for wide value ranges
- Categorical mapping: Convert inputs to predefined categories or labels
- Normalized scoring: Map arbitrary ranges to standard scales
- Threshold-based: Apply cutoffs or breakpoints for bucketing
- Custom transformations: Apply domain-specific rules or formulas

HANDLING UNDERSPECIFIED INSTRUCTIONS:
When scaling instructions are vague or incomplete:
- Infer reasonable defaults from context (e.g., 0-10 for ratings, 0-1 for probabilities)
- Look for implicit patterns in the instructions
- Consider decision tree logic: "if X then Y, else if A then B"
- Apply narrative anchors: map to conceptual waypoints like "beginner/intermediate/expert"
- Use semantic pairings: match inputs to outputs based on meaning, not just values
- Create non-linear scales using conditional rules or piecewise functions

BEST PRACTICES:
- Consider semantic meaning, not just numeric values
- Maintain consistency - identical inputs should produce identical outputs
- Preserve relative relationships when scaling numeric values
- Handle nulls, undefined, and edge values appropriately
- Infer the expected output type from the instructions

${promptConstants.xmlRules}`;

// Generate a scale specification from instructions
export async function scaleSpec(prompt, config = {}) {
  const {
    model = promptConstants.defaultModel,
    maxTokens = promptConstants.defaultMaxTokens,
    temperature = promptConstants.defaultTemperature,
    ...rest
  } = config;

  const specSystemPrompt = `You are a scale specification generator. Analyze the scaling instructions and produce a clear, comprehensive specification.`;

  const specUserPrompt = `Analyze these scaling instructions and generate a scale specification.

<scaling_instructions>
${prompt}
</scaling_instructions>

Provide a JSON object with exactly three string properties:
- domain: A single string describing expected input types, formats, and valid ranges
- range: A single string describing output types, formats, and possible values  
- mapping: A single string with clear description of how inputs map to outputs, including any formulas, rules, edge cases, and examples

IMPORTANT: Each property must be a simple string value, not a nested object or array.`;

  const response = await chatGPT(specUserPrompt, {
    modelOptions: {
      model,
      maxTokens,
      temperature,
      response_format: {
        type: 'json_schema',
        json_schema: scaleSpecificationJsonSchema,
      },
    },
    system: specSystemPrompt,
    ...rest,
  });

  // With structured outputs, response is now an object
  return response;
}

// Apply a scale transformation with an explicit specification
export async function applyScale(input, specification, config = {}) {
  const {
    model = promptConstants.defaultModel,
    maxTokens = promptConstants.defaultMaxTokens,
    temperature = promptConstants.defaultTemperature,
    ...rest
  } = config;

  const inputText = typeof input === 'object' ? JSON.stringify(input) : String(input);

  const specText =
    typeof specification === 'object'
      ? `Domain: ${specification.domain}\nRange: ${specification.range}\nMapping: ${specification.mapping}`
      : specification;

  const userPrompt = `Apply the scaling function to transform the input according to the established scale specification.

<scale_specification>
${specText}
</scale_specification>

<current_input>
${inputText}
</current_input>

Apply the scale specification exactly as described to transform the current input.
Return the scaled result as a JSON object with a "value" property.`;

  const response = await chatGPT(userPrompt, {
    modelOptions: {
      model,
      maxTokens,
      temperature,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'scale_result',
          schema: scaleResultSchema,
        },
      },
    },
    system: scaleSystemPrompt,
    ...rest,
  });

  return response;
}

// Create a scale function with a pre-generated specification for consistency
export function createScale(prompt, config = {}) {
  const {
    model = promptConstants.defaultModel,
    maxTokens = promptConstants.defaultMaxTokens,
    temperature = promptConstants.defaultTemperature,
    ...rest
  } = config;

  // Store the specification in closure
  let specification = null;

  const scaleFunction = async function (input) {
    // Generate specification on first use
    if (!specification) {
      specification = await scaleSpec(prompt, { model, maxTokens, temperature, ...rest });
    }

    // Apply the scale using the stored specification
    return await applyScale(input, specification, { model, maxTokens, temperature, ...rest });
  };

  // Add properties for introspection
  Object.defineProperties(scaleFunction, {
    prompt: {
      get() {
        return prompt;
      },
      enumerable: true,
    },
    specification: {
      get() {
        return specification;
      },
      enumerable: true,
    },
  });

  return scaleFunction;
}

// Original scale function - simple, stateless version
export default function scale(prompt, config = {}) {
  const {
    model = promptConstants.defaultModel,
    maxTokens = promptConstants.defaultMaxTokens,
    temperature = promptConstants.defaultTemperature,
    ...rest
  } = config;

  const scaleFunction = async function (input) {
    const inputText = typeof input === 'object' ? JSON.stringify(input) : String(input);

    const userPrompt = `Apply the scaling function to transform the input according to the instructions.

<scaling_instructions>
${prompt}
</scaling_instructions>

<current_input>
${inputText}
</current_input>

Return the scaled result as a JSON object with a "value" property.

${asJSON}`;

    const response = await chatGPT(userPrompt, {
      modelOptions: {
        model,
        maxTokens,
        temperature,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'scale_result',
            schema: scaleResultSchema,
          },
        },
      },
      system: scaleSystemPrompt,
      ...rest,
    });

    return response;
  };

  // Add prompt property for introspection
  Object.defineProperty(scaleFunction, 'prompt', {
    get() {
      return prompt;
    },
    enumerable: true,
  });

  return scaleFunction;
}
