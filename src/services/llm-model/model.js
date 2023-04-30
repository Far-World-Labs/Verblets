export default class Model {
  constructor(options) {
    Object.assign(this, options);
  }

  toTokens(text) {
    return this.tokenizer(text);
  }

  budgetTokens(text, { completionMax = Infinity } = {}) {
    const prompt = this.toTokens(text).length;
    const total = this.maxTokens;
    const completion = Math.min(total - prompt, completionMax);

    return {
      completion,
      prompt,
      total,
    };
  }
}
