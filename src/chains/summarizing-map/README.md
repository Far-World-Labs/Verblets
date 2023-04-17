# SummarizingMap

SummarizingMap is a utility class designed to help manage a collection of data elements for AI prompts. It allows you to compress incoming variables based on weights relative to an overall target budget for the variables.

## Usage

```javascript
import SummarizingMap from '../lib/summarizing-map/index.js';
import toTokens from '../lib/to-tokens/index.js';
import chatGPT from '../../index.js';

const promptFunction = (data) => {
  return `Please solve a problem for me with the following input data:
  ${data.example.text}

Reference the following code:
${data.example.code}`;
};

const variableTokens = 100;
const promptTokens = toTokens(promptFunction).length;
const solutionTokens = 200;
const maxTokens = promptTokens + variableTokens + solutionTokens

const summarizerMap = new SummarizingMap(variableTokens);
summarizerMap.set({ key: 'example.text', value: 'Long text data...', weight: 1, type: 'text' });
summarizerMap.set({ key: 'example.code', value: 'Long code data...', weight: 0.5, type: 'code' });

const summarizedData = await summarizerMap.getAll();

const prompt = promptFunction(summarizedData);
const response = await chatGPT(prompt, { maxTokens });
```
