import chatGPT from '../../lib/chatgpt/index.js';
import retry from '../../lib/retry/index.js';
import numberWithUnits from '../../verblets/number-with-units/index.js';
import number from '../../verblets/number/index.js';
import date from '../date/index.js';
import { asXML } from '../../prompts/wrap-variable.js';
import templateReplace from '../../lib/template-replace/index.js';
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
  prompt,
  getData,
  historySize = 5,
  initial = null,
  onTick,
  model,
  llm,
  maxAttempts = 3,
  onProgress,
  now = new Date(),
  ...options
} = {}) {
  let timer;
  let count = 0;
  let lastResult = initial;
  const history = [];
  let active = true;

  const step = async () => {
    if (!active) return;

    try {
      // Get data for AI decision making
      lastResult = await getData({
        count,
        lastInvocationResult: lastResult,
        initial,
      });

      // Replace {variable} placeholders in the prompt with actual values from lastResult
      const processedPrompt = templateReplace(prompt, lastResult);

      // Always invoke the prompt to determine the next interval
      const intervalPrompt = `${contentIsInstructions} ${processedPrompt}

${explainAndSeparate} ${explainAndSeparatePrimitive}

Your response should be an ISO date or a short duration like "10 minutes".
${asXML(lastResult, { tag: 'last-result', title: 'Last result:' })}
${asXML(history, { tag: 'history', title: 'History:' })}
${asXML(count, { tag: 'count', title: 'Count:' })}
Next wait:`;

      const intervalText = await retry(chatGPT, {
        label: 'set-interval',
        maxAttempts,
        onProgress,
        now,
        chainStartTime: now,
        chatGPTPrompt: intervalPrompt,
        chatGPTConfig: {
          modelOptions: model ? { modelName: model, ...llm } : { ...llm },
          ...options,
        },
        logger: options.logger,
      });

      history.push(intervalText);
      if (history.length > historySize) history.shift();

      const delay = await toMs(intervalText, { llm, ...options });

      // Call onTick callback if provided - this is when the tick happens
      if (onTick) {
        const nextTime = new Date(Date.now() + delay);
        await onTick({
          timingString: intervalText,
          data: lastResult,
          nextDate: nextTime,
        });
      }

      count += 1;

      // Schedule the next iteration only if still active
      if (active) {
        timer = setTimeout(step, delay);
      }
    } catch (error) {
      console.error('Error in setInterval step:', error);

      // Call onTick with the data we have, even if LLM failed
      if (onTick && lastResult) {
        await onTick({
          timingString: 'error - using fallback',
          data: lastResult,
          nextDate: new Date(Date.now() + 1000), // 1 second fallback
          error: error.message,
        });
      }

      count += 1;

      // Continue with a fallback delay of 1 second only if still active
      if (active) {
        timer = setTimeout(step, 1000);
      }
    }
  };

  // Start immediately - the prompt will determine the first interval
  timer = setTimeout(step, 0);

  const stop = () => {
    active = false;
    clearTimeout(timer);
  };

  return stop;
}
