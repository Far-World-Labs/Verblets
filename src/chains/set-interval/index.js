import chatGPT from '../../lib/chatgpt/index.js';
import numberWithUnits from '../../verblets/number-with-units/index.js';
import number from '../../verblets/number/index.js';
import date from '../date/index.js';
import { constants as promptConstants } from '../../prompts/index.js';

const { contentIsInstructions, explainAndSeparate, explainAndSeparatePrimitive } = promptConstants;

const UNIT_MS = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60000,
  min: 60000,
  mins: 60000,
  minute: 60000,
  minutes: 60000,
  h: 3600000,
  hr: 3600000,
  hrs: 3600000,
  hour: 3600000,
  hours: 3600000,
  d: 86400000,
  day: 86400000,
  days: 86400000,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

async function toMs(text, config = {}) {
  const clean = String(text).trim();
  if (ISO_DATE_RE.test(clean)) {
    const diff = new Date(clean).getTime() - Date.now();
    if (diff > 0) return diff;
  }
  const nu = await numberWithUnits(clean, config);
  if (nu && nu.value !== undefined) {
    const unit = (nu.unit || 'ms').toLowerCase();
    if (UNIT_MS[unit]) return nu.value * UNIT_MS[unit];
  }
  const dt = await date(clean, config);
  if (dt instanceof Date) {
    const diff = dt.getTime() - Date.now();
    if (diff > 0) return diff;
  }
  const n = await number(clean, config);
  if (typeof n === 'number') return n;
  return 0;
}

export default function setInterval({
  intervalPrompt,
  fn,
  historySize = 5,
  firstInterval = '0',
  model,
  llm,
  ...options
} = {}) {
  let timer;
  let count = 0;
  let lastResult;
  const history = [];
  let active = true;
  const config = { llm, ...options };

  const step = async () => {
    if (!active) return;
    const prompt = `${contentIsInstructions} ${intervalPrompt}

${explainAndSeparate} ${explainAndSeparatePrimitive}

Your response should be an ISO date or a short duration like "10 minutes".
Last result: ${JSON.stringify(lastResult)}
History: ${history.join(' | ')}
Next wait:`;
    const intervalText = await chatGPT(
      prompt,
      model
        ? { modelOptions: { modelName: model, ...llm }, ...options }
        : { modelOptions: { ...llm }, ...options }
    );
    history.push(intervalText);
    if (history.length > historySize) history.shift();
    const delay = await toMs(intervalText, config);
    lastResult = await fn({
      count,
      delay,
      rawInterval: intervalText,
      history: [...history],
      lastInvocationResult: lastResult,
    });
    count += 1;
    timer = setTimeout(step, delay);
  };

  if (firstInterval === '0' || firstInterval === 0) {
    timer = setTimeout(step, 0);
  } else {
    (async () => {
      const initialDelay = await toMs(firstInterval, config);
      timer = setTimeout(step, initialDelay);
    })();
  }

  return () => {
    active = false;
    clearTimeout(timer);
  };
}
