let currentLogger = {
  info: (...args) => console.info(...args),
  debug: (...args) => console.debug(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export const setLogger = (logger) => {
  if (logger && ['info', 'debug', 'warn', 'error'].every((m) => typeof logger[m] === 'function')) {
    currentLogger = logger;
  } else {
    throw new Error('Logger must implement info, debug, warn and error methods');
  }
};

export const getLogger = () => currentLogger;

const proxy = {};
['info', 'debug', 'warn', 'error'].forEach((level) => {
  proxy[level] = (...args) => currentLogger[level](...args);
});

proxy.setLogger = setLogger;
proxy.getLogger = getLogger;

export default proxy;
