import chatGPT from '../../lib/chatgpt/index.js';
import toObject from '../../verblets/to-object/index.js';
import { constants as promptConstants } from '../../prompts/index.js';
import modelService from '../../services/llm-model/index.js';

const { onlyJSON } = promptConstants;

export const extractSentences = (text) => {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) {
    return [text];
  }
  return matches.map((s) => s.trim());
};

export const extractPronouns = (sentence) => {
  const pronounRegex =
    /\b(he|she|they|it|him|her|them|his|hers|their|its|we|us|our|you|your|yours|i|me|my|mine|this|that|these|those)\b/gi;
  const matches = sentence.match(pronounRegex) || [];
  return [...new Set(matches.map((p) => p.toLowerCase()))];
};

const pronounPrompt = ({ context, sentence, pronoun }) => `
${onlyJSON}
Context:\n${context}

In the sentence "${sentence}", what does the pronoun "${pronoun}" refer to? Respond with { "reference": "<short description>" }.
${onlyJSON}`;

export default async function coreference(
  text,
  { windowSize = 2, model = modelService.getBestPublicModel() } = {}
) {
  const sentences = extractSentences(text);
  const results = [];
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const sentence = sentences[i];
    const pronouns = extractPronouns(sentence);
    if (!pronouns.length) continue;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(sentences.length, i + windowSize + 1);
    const context = sentences.slice(start, end).join(' ');
    for (const pronoun of pronouns) {
      const prompt = pronounPrompt({ context, sentence, pronoun });
      const budget = model.budgetTokens(prompt);
      // eslint-disable-next-line no-await-in-loop
      const response = await chatGPT(prompt, { maxTokens: budget.completion });
      // eslint-disable-next-line no-await-in-loop
      const { reference } = await toObject(response);
      results.push({ pronoun, reference, sentence });
    }
  }
  return results.reverse();
}
