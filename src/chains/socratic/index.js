import chatGPT from '../../lib/chatgpt/index.js';
import modelService from '../../services/llm-model/index.js';

const defaultAsk = async ({
  topic,
  history = [],
  model = modelService.getBestPublicModel(),
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');

  const prompt = `${
    historyText ? `${historyText}\n` : ''
  }Using the Socratic method, ask one short question that challenges assumptions about "${topic}".`;
  const budget = model.budgetTokens(prompt);
  return await chatGPT(prompt, { maxTokens: budget.completion, temperature: 0.7 });
};

const defaultAnswer = async ({
  question,
  history = [],
  _topic,
  model = modelService.getBestPublicModel(),
} = {}) => {
  const historyText = history.map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`).join('\n');

  const prompt = `${
    historyText ? `${historyText}\n` : ''
  }Answer the question thoughtfully and briefly:\n"${question}"`;
  const budget = model.budgetTokens(prompt);
  return await chatGPT(prompt, { maxTokens: budget.completion, temperature: 0.7 });
};

class SocraticMethod {
  constructor(statement, { ask = defaultAsk, answer = defaultAnswer } = {}) {
    this.statement = statement;
    this.ask = ask;
    this.answer = answer;
    this.history = [];
  }

  getDialogue() {
    return this.history;
  }

  async step() {
    const question = await this.ask({ topic: this.statement, history: this.history });
    const answer = await this.answer({ question, history: this.history, topic: this.statement });
    const turn = { question, answer };
    this.history.push(turn);
    return turn;
  }

  async run(depth = 3) {
    for (let i = 0; i < depth; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.step();
    }
    return this.history;
  }
}

export const socratic = (statement, options) => new SocraticMethod(statement, options);

export default SocraticMethod;
