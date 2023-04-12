import { onlyJSON } from './output-modifiers.js';
import fs from 'fs/promises';

const intentSchema = JSON.parse(await fs.readFile('./src/json-schemas/intent.json'));

/**
 * Approximates intent recognition like you might find with Wit.ai,
 * for tasks where you want the model to extract the intent and parameters
 * so an existing function can compute the result.
 */
export default `

Give me an intent response for the above intent.

Ensure the intent is sufficiently abstract.
Include the full list of supplied parameters.
Don't include optional parameters under "parameters" unless they were found when the intent was parsed.

Make it conform exactly to the following schema:
\`\`\`
${intentSchema}
\`\`\`

This is an example:
\`\`\`
{
  "queryText": "play some music",
  "intent": {
    "operation": "play-music",
    "displayName": "Play Music"
  },
  "parameters": {
    "genre": "rock"
  },
  "optionalParameters": {
    "artist": "The Beatles"
  }
}

\`\`\`

${onlyJSON}
`
