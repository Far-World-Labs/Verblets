export function resolveOption(name, options, fallback) {
  const fn = options.optionValue?.[name];
  if (typeof fn === 'function') {
    try {
      return fn(options.optionContext, { logger: options.logger }) ?? fallback;
    } catch {
      return fallback;
    }
  }
  return options[name] ?? fallback;
}

export async function resolveAsyncOption(name, options, { fallback, timeout } = {}) {
  const fn = options.optionAsyncValue?.[name];
  if (typeof fn !== 'function') return options[name] ?? fallback;

  if (!timeout) {
    return (await fn(options.optionContext, { logger: options.logger })) ?? fallback;
  }

  let timer;
  const result = await Promise.race([
    fn(options.optionContext, { logger: options.logger }),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`optionAsyncValue "${name}" timed out after ${timeout}ms`)),
        timeout
      );
    }),
  ]);
  clearTimeout(timer);
  return result ?? fallback;
}
