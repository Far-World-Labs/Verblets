export function buildStepContext(
  page,
  { url, screenshotPath, stepNumber, previousAction, accumulator, urlIndex, data }
) {
  const query = (selector) => page.textContent(selector);

  const queryAll = (selector) =>
    page.$$eval(selector, (els) => els.map((el) => el.textContent?.trim()));

  const queryJson = (selector, transform) => page.$$eval(selector, transform);

  const captureNetwork = (urlPattern) => {
    const reqs = [];
    const resps = [];
    const matches = (target) => {
      if (!urlPattern) return true;
      if (typeof urlPattern === 'string') return target.includes(urlPattern);
      return urlPattern.test(target);
    };
    page.on('request', (req) => {
      if (matches(req.url())) reqs.push(req);
    });
    page.on('response', (resp) => {
      if (matches(resp.url())) resps.push(resp);
    });
    return {
      requests: () => [...reqs],
      responses: () => [...resps],
      clear: () => {
        reqs.length = 0;
        resps.length = 0;
      },
    };
  };

  /**
   * Read localStorage — all keys or a specific one.
   * localStorage()      → { key: value, ... }
   * localStorage('key') → value (string) or undefined
   */
  /* eslint-disable no-undef */
  const localStorage = (key) => {
    if (key !== undefined) {
      return page.evaluate((k) => window.localStorage.getItem(k), key);
    }
    return page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        items[k] = window.localStorage.getItem(k);
      }
      return items;
    });
  };
  /* eslint-enable no-undef */

  return {
    url,
    screenshotPath,
    stepNumber,
    urlIndex,
    previousAction,
    accumulator,
    data: data ?? {},
    page,
    query,
    queryAll,
    queryJson,
    captureNetwork,
    localStorage,
  };
}
