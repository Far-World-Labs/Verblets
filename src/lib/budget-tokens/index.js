import toTokens from '../to-tokens/index.js';
import { defaultModel } from '../../constants/openai.js';

export default (text, { completionMax = Infinity } = {}) => {
  const prompt = toTokens(text).length;
  const total = defaultModel.maxTokens;
  const completion = Math.min(total - prompt, completionMax);

  return {
    completion,
    prompt,
    total,
  };
};
