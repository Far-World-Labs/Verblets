import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

export default async function peopleList(schemaDescription, count = 3, config = {}) {
  const { llm, ...options } = config;
  const instructions = wrapVariable(schemaDescription, { tag: 'schema' });
  const prompt =
    `Create a list of ${count} people that match <schema>. Each entry must include a name and description. 
    
    Respond with a JSON object containing a "people" array. Each person should be an object with "name" and "description" properties.
    
    Example format:
    {
      "people": [
        {"name": "John Doe", "description": "Software engineer with 5 years experience"},
        {"name": "Jane Smith", "description": "UX designer specializing in mobile apps"}
      ]
    }` + `\n\n${instructions}`;
  const response = await chatGPT(prompt, {
    modelOptions: { response_format: { type: 'json_object' }, ...llm },
    ...options,
  });

  const parsed = JSON.parse(typeof response === 'string' ? response : JSON.stringify(response));

  // Handle different possible response structures
  if (Array.isArray(parsed)) {
    return parsed;
  } else if (parsed.people && Array.isArray(parsed.people)) {
    return parsed.people;
  } else if (parsed.list && Array.isArray(parsed.list)) {
    return parsed.list;
  } else {
    // If it's an object with array values, try to find the array
    const values = Object.values(parsed);
    const arrayValue = values.find((val) => Array.isArray(val));
    if (arrayValue) {
      return arrayValue;
    }
    // Fallback: return empty array if no valid structure found
    console.warn('peopleList: Could not extract array from response:', parsed);
    return [];
  }
}
