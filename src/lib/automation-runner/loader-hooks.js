/**
 * Loader hooks for @app/* resolution and bare .json imports.
 *
 * @app/run-context  → src/lib/run-context/index.js
 * @app/foo          → src/lib/foo/index.js
 * *.json            → import with { type: 'json' } (Node 25+)
 */

import { resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolvePath(fileURLToPath(import.meta.url), '../../../..');
const APP_PREFIX = '@app/';

export function resolve(specifier, context, next) {
  if (specifier.startsWith(APP_PREFIX)) {
    const name = specifier.slice(APP_PREFIX.length);
    const filePath = resolvePath(PROJECT_ROOT, 'src', 'lib', name, 'index.js');
    return { url: pathToFileURL(filePath).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith('.json') && !context.importAttributes?.type) {
    return next(url, {
      ...context,
      importAttributes: { ...context.importAttributes, type: 'json' },
    });
  }
  return next(url, context);
}
