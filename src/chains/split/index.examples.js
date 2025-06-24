import split from './index.js';

export default async () => {
  const DELIM = '---763927459---';
  const text = `Scene one. Scene two. Scene three.`;
  const result = await split(text, 'before "Scene two" or "Scene three"', {
    delimiter: DELIM,
  });
  console.log(result.split(DELIM));
};
