import fs from 'node:fs/promises';
import chatGPT from '../../lib/chatgpt/index.js';
import { asXML } from '../../prompts/wrap-variable.js';

export default async function test(path, instructions) {
  try {
    const code = await fs.readFile(path, 'utf-8');

    const prompt = `Analyze this code and ${instructions}:

${asXML(code, { tag: 'code-to-analyze' })}

OUTPUT FORMAT:
- If issues are found: List each issue on a separate line with specific, actionable feedback
- If no issues are found: Respond with exactly "NO_ISSUES_FOUND"

GUIDELINES:
- Focus only on issues related to the test criteria
- Provide specific line numbers or code references when possible
- Suggest concrete fixes for each issue identified
- Be concise but clear in your feedback`;

    const result = await chatGPT(prompt, {
      modelOptions: {
        modelName: 'fastGoodCheap',
      },
    });

    const feedback = result.trim();

    // Return empty array if no issues found
    if (
      feedback === 'NO_ISSUES_FOUND' ||
      feedback.toLowerCase().includes('no issues') ||
      feedback.toLowerCase().includes('looks good')
    ) {
      return [];
    }

    // Split feedback into individual issues
    const issues = feedback.split('\n').filter((line) => line.trim().length > 0);
    return issues;
  } catch (error) {
    return [`Error analyzing ${path}: ${error.message}`];
  }
}
