import chatGPT from '../../lib/chatgpt/index.js';
import stripResponse from '../../lib/strip-response/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const { asJSON } = promptConstants;

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const scaleResultSchema = JSON.parse(readFileSync(join(__dirname, 'scale-result.json'), 'utf8'));

export default function scale(prompt, config = {}) {
  const {
    model = promptConstants.defaultModel,
    maxTokens = promptConstants.defaultMaxTokens,
    temperature = promptConstants.defaultTemperature,
    ...rest
  } = config;

  return async function (input) {
    const inputText = typeof input === 'object' ? JSON.stringify(input) : String(input);

    const systemPrompt = `You are a scaling function that maps input values to output values according to specific instructions.

SCALING GUIDELINES:
1. Analyze the scaling instructions to understand:
   - Input format and expected data types
   - Target output range or categories
   - Transformation logic or mapping rules
   - Any special cases or edge conditions

2. Common scaling patterns:
   - Linear scaling: Map values proportionally to a numeric range
   - Logarithmic scaling: Use log transformations for wide value ranges
   - Categorical mapping: Convert inputs to predefined categories
   - Normalized scoring: Map to 0-1 or 0-100 ranges
   - Custom transformations: Apply domain-specific rules

3. Best practices:
   - Maintain consistency across similar inputs
   - Handle edge cases gracefully
   - Return appropriate data types as specified
   - Consider the semantic meaning, not just numeric values

Your task is to analyze the current input and produce an appropriate output value according to the scaling instructions.

${promptConstants.xmlRules}`;

    const userPrompt = `<scaling_instructions>
${prompt}
</scaling_instructions>

<current_input>
${inputText}
</current_input>

Apply the scaling function to the current input and return the result as a JSON object with a "value" property. ${asJSON}`;

    const response = await chatGPT(userPrompt, {
      model,
      maxTokens,
      temperature,
      system: systemPrompt,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'scale_result',
          strict: true,
          schema: scaleResultSchema,
        },
      },
      ...rest,
    });

    const result = JSON.parse(stripResponse(response));
    return result.value;
  };
}
