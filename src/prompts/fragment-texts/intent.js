import { onlyJSON } from './output-modifiers.js';

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

For example:
\`\`\`
{
  "queryText": "show me flights to New York",
  "intent": {
    "operation": "book-flight",
    "displayName": "Book flights"
  },
  "parameters": {
    "destination": "New York"
  },
  "optionalParameters": {
    "origin": "",
    "departureDate": "",
    "returnDate": "",
    "numPassengers": ""
  },
  "fulfillmentText": "Here are some flights to New York.",
}
\`\`\`

${onlyJSON}
`
