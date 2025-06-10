import fs from 'node:fs';

const bulkMap = async (list, fn, chunkSize = 10) => {
  const results = new Array(list.length);
  const promises = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const batch = list.slice(i, i + chunkSize);
    const startIndex = i;
    const p = Promise.resolve()
      .then(() => Promise.all(batch.map(fn)))
      .then((output) => {
        output.forEach((r, j) => {
          results[startIndex + j] = r;
        });
      });
    promises.push(p);
  }
  await Promise.all(promises);
  return results;
};

const formatLog = ({ level, args, stack }) => {
  const stackLine = stack.split('\n')[2] || '';
  const match = stackLine.match(/\((.*):(\d+):(\d+)\)/);
  let context = '';
  if (match) {
    const [, file, line] = match;
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const codeLine = lines[Number(line) - 1]?.trim();
      context = `${file}:${line} ${codeLine}`;
    } catch {
      /* ignore */
    }
  }
  const parts = args.map((a) => {
    if (a instanceof Error) {
      return `${a.message}\n${a.stack}`;
    }
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }
    return String(a);
  });
  return { level, message: `[${level}] ${context} ${parts.join(' ')}` };
};

export default function createLogger({
  batchSize = 10,
  flushInterval = 5000,
  baseLogger = console,
} = {}) {
  let logs = [];
  let timer;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!logs.length) return;
    const batch = logs;
    logs = [];
    const formatted = await bulkMap(batch, formatLog, batchSize);
    formatted.forEach(({ level, message }) => {
      baseLogger[level](message);
    });
  };

  const schedule = () => {
    if (!timer) {
      timer = setTimeout(flush, flushInterval);
    }
  };

  const makeLog =
    (level) =>
    (...args) => {
      logs.push({ level, args, stack: new Error().stack });
      if (logs.length >= batchSize) {
        flush();
      } else {
        schedule();
      }
    };

  return {
    info: makeLog('info'),
    debug: makeLog('debug'),
    warn: makeLog('warn'),
    error: makeLog('error'),
    flush,
  };
}
