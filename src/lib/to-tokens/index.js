import * as tokenizer from 'gpt3-tokenizer';

// This library really doesn't import well with nodejs
// This may not be the best solution, but it works
// with the standard way of running the app as well as
// with 'npm run script'
let Tokenizer = { ...tokenizer };
if (Tokenizer.default) {
  Tokenizer = Tokenizer.default;
}
if (Tokenizer.default) {
  Tokenizer = Tokenizer.default;
}

export default (item) => {
  const enc = new Tokenizer({ type: 'gpt3' });
  return enc.encode(item).text;
};
