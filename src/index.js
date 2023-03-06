import fetch from 'node-fetch';
import chai from 'chai';

const expect = chai.expect;

const Gpt3Model = {
  davinci003: 'text-davinci-003',
};

const defaultModel = Gpt3Model.davinci003;
expect(process.env.OPENAI_API_KEY).to.exist;
const apiKey = process.env.OPENAI_API_KEY;

const run = async (prompt, {
  model=defaultModel
}={}) => {
  const apiUrl = 'https://api.openai.com/v1/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  const data = {
    model,
    prompt,
    max_tokens: 160,
    temperature: 0.7,
    frequency_penalty: 0.5
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.log(response)
      throw new Error(`Request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].text;
  } catch (error) {
    console.error(error);
  }
}

// Example usage
const message = 'What is the OpenAI mission?';

run(message)
  .then(response => console.log(response))
  .catch(error => console.error(error));

export default run;
