import disambiguate from './index.js';

const example = await disambiguate({
  term: 'bark',
  context: 'I heard the bark while walking in the forest',
});
console.log(example);
