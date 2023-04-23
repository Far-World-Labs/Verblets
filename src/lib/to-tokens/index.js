import Tokenizer from 'gpt3-tokenizer';

export default (item) => {
  const enc = new Tokenizer({ type: 'gpt3' });
  return enc.encode(item);
};
