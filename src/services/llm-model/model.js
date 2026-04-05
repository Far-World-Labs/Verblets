export default class Model {
  constructor(options) {
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(options));
  }

  toTokens(text) {
    // Content array: extract text parts, estimate ~300 tokens per image
    if (Array.isArray(text)) {
      const textContent = text
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
      const imageCount = text.filter((block) => block.type === 'image').length;
      const textTokens = this.tokenizer(textContent);
      const IMAGE_TOKEN_ESTIMATE = 300;
      const padding = Array.from({ length: imageCount * IMAGE_TOKEN_ESTIMATE }, () => 0);
      return [...textTokens, ...padding];
    }
    // Ensure text is a string
    const textStr = typeof text === 'string' ? text : String(text || '');
    return this.tokenizer(textStr);
  }

  budgetTokens(text, { completionMax = Infinity } = {}) {
    const prompt = this.toTokens(text).length;
    const total = this.maxContextWindow;
    const completion = Math.min(Math.min(total - prompt, this.maxOutputTokens), completionMax);

    return {
      completion,
      prompt,
      total,
    };
  }
}
