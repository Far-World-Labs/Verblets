import stripResponse from '../strip-response/index.js';

export default (val) => {
  const clean = stripResponse(String(val)).trim();
  if (clean.toLowerCase() === 'undefined') return undefined;
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('ChatGPT output [error]');
  }
  return parsed;
};
