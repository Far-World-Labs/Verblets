const VALID_ACTIONS = new Set([
  'click',
  'type',
  'scroll',
  'wait',
  'navigate',
  'eval',
  'resize',
  'done',
]);

export function validateAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('Step must return an action object');
  }
  if (!VALID_ACTIONS.has(action.action)) {
    throw new Error(`Unknown action: ${action.action}. Valid: ${[...VALID_ACTIONS].join(', ')}`);
  }
}

export function executeAction(page, action) {
  validateAction(action);

  const dispatch = {
    click: () => page.click(action.selector, action.options),
    type: () => page.fill(action.selector, action.text),
    scroll: () =>
      page.evaluate(
        ({ dir, amt }) => window.scrollBy(0, dir === 'down' ? amt || 500 : -(amt || 500)), // eslint-disable-line no-undef
        { dir: action.direction || 'down', amt: action.amount }
      ),
    wait: () => page.waitForTimeout(action.ms || 1000),
    navigate: () => page.goto(action.url, { waitUntil: 'domcontentloaded' }),
    eval: () => page.evaluate(action.fn, ...(action.args || [])),
    resize: () => page.setViewportSize({ width: action.width, height: action.height || 800 }),
    done: () => undefined,
  };

  return dispatch[action.action]();
}
