export default class Model {
  constructor(options) {
    Object.assign(this, options);
  }

  toTokens(text) {
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
