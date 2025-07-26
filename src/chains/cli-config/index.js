import bulkReduce from '../bulk-reduce/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import stripResponse from '../../lib/strip-response/index.js';

const { onlyJSON } = promptConstants;

function buildDefaults(spec) {
  const defaults = {};
  Object.entries(spec).forEach(([key, def]) => {
    if (Object.hasOwn(def, 'default')) {
      defaults[key] = def.default;
    }
  });
  return defaults;
}

export default async function cliConfig(text, spec = {}, config = {}) {
  const { chunkSize = 5, llm, ...options } = config;
  const fields = Object.keys(spec);
  const defaults = buildDefaults(spec);

  const instructions =
    `${onlyJSON}\nCLI argument: "${text}"\n` +
    'Each item in <list> is a property name from the specification. ' +
    'Update the <accumulator> JSON object for each property using information from the CLI argument. ' +
    "Use the property's default value if no value is specified. " +
    'If the spec lists enum options, the value must be one of them.\n\n' +
    `Specification: ${JSON.stringify(spec)}`;

  const resultString = await bulkReduce(fields, instructions, {
    chunkSize,
    initial: JSON.stringify(defaults),
    llm,
    ...options,
  });

  return JSON.parse(stripResponse(resultString));
}
