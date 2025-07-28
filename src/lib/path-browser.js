// Browser shim for Node.js path module
// Provides basic path operations that work in browser

export const sep = '/';
export const delimiter = ':';

export function basename(path, ext) {
  const parts = path.split('/');
  let base = parts[parts.length - 1] || '';

  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }

  return base;
}

export function dirname(path) {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function extname(path) {
  const base = basename(path);
  const lastDot = base.lastIndexOf('.');
  return lastDot === -1 ? '' : base.slice(lastDot);
}

export function join(...paths) {
  return paths.filter(Boolean).join('/').replace(/\/+/g, '/').replace(/\/$/, '');
}

export function resolve(...paths) {
  // In browser, just join paths with forward slashes
  return `/${join(...paths)}`;
}

export function relative(from, to) {
  // Simple implementation for browser
  return to.startsWith(from) ? to.slice(from.length + 1) : to;
}

export function isAbsolute(path) {
  return path.startsWith('/');
}

export default {
  sep,
  delimiter,
  basename,
  dirname,
  extname,
  join,
  resolve,
  relative,
  isAbsolute,
};
