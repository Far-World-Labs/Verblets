# SummaryMap

SummaryMap is a utility class designed to help manage a collection of data elements for AI prompts. It allows you to compress incoming variables based on weights relative to an overall target budget for the variables.

## Usage

```javascript
import SummaryMap from '../lib/summary-map/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import pave from '../../lib/pave/index.js';
import modelService from '../../services/llm-model/index.js';

const promptFunction = (data) => {
  return `Please solve a problem for me with the following input data:
  ${data.example.text}

Reference the following code:
${data.example.code}`;
};

const variableTokens = 100;
const promptTokens = modelService.getBestPublicModel().toTokens(promptFunction).length;
const solutionTokens = 200;
const maxTokens = promptTokens + variableTokens + solutionTokens

const summaryMap = new SummaryMap({ targetTokens: variableTokens });
summaryMap.set('example.text', { value: 'Long text data...', weight: 1, type: 'text' });
summaryMap.set('example.code', { value: 'Long code data...', weight: 0.5, type: 'code' });

const promptInputs = await summaryMap.pavedSummaryResult();
const prompt = promptFunction(promptInputs);
const response = await chatGPT(prompt, { modelOptions: { maxTokens }});
```
