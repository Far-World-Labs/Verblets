import fs from 'node:fs/promises';
import chatGPT from '../../lib/chatgpt/index.js';

export default async function test(path, instructions) {
  try {
    const code = await fs.readFile(path, 'utf-8');

    const prompt = `Analyze this code and ${instructions}:

\`\`\`javascript
${code}
\`\`\`

If you find any issues, provide specific, actionable feedback with examples.
If you find no issues, respond with exactly "NO_ISSUES_FOUND".

Provide your response as a list of issues, one per line, or "NO_ISSUES_FOUND" if none exist.`;

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
