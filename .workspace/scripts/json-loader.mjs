// Loader hook that adds { type: 'json' } import attribute to .json imports
// Needed because verblets uses bare JSON imports and Node 22+ requires the attribute
// Usage: node --import ./.notes/scripts/register-json.mjs your-script.js

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, {
      ...context,
      importAttributes: { ...context.importAttributes, type: 'json' },
    });
  }
  return nextLoad(url, context);
}
