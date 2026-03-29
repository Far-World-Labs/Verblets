/* global URLSearchParams */
/**
 * URL frontier — manages the crawl queue with deduplication,
 * depth tracking, same-domain filtering, and skip recording.
 */

/**
 * Normalize a URL for deduplication: strip fragment, trailing slash, sort query params.
 */
const normalizeUrl = (raw) => {
  const url = new URL(raw);
  url.hash = '';
  // Sort query params for consistent dedup
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(params).toString();
  // Strip trailing slash except for root
  const normalized = url.toString();
  return normalized.endsWith('/') && url.pathname !== '/' ? normalized.slice(0, -1) : normalized;
};

/**
 * Extract the path prefix up to the Nth segment.
 * e.g. '/app/trips/123/details' at depth 2 → '/app/trips'
 */
const pathPrefix = (url, segments = 2) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  return `/${parts.slice(0, segments).join('/')}`;
};

const createFrontier = (startUrl, opts = {}) => {
  const origin = new URL(startUrl).origin;
  const sameDomain = opts.sameDomain !== false;
  const maxDepth = opts.maxDepth ?? 10;

  // State
  const pending = []; // [{ url, depth, source }]
  const visited = new Map(); // normalizedUrl → { url, depth, source }
  const skipped = new Map(); // normalizedUrl → reason
  const seen = new Set(); // all normalized URLs ever encountered

  // Seed
  const startNorm = normalizeUrl(startUrl);
  pending.push({ url: startUrl, normalized: startNorm, depth: 0, source: '(start)' });
  seen.add(startNorm);

  /**
   * Add discovered URLs from a page. Deduplicates and filters.
   * Returns the count of genuinely new URLs added.
   */
  const addLinks = (links, depth, source) => {
    let added = 0;
    for (const link of links) {
      const href = link.href || link;
      const normalized = normalizeUrl(href);

      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Same-domain filter
      if (sameDomain && !href.startsWith(origin)) {
        skipped.set(normalized, 'external');
        continue;
      }

      // Depth filter
      if (depth + 1 > maxDepth) {
        skipped.set(normalized, 'max-depth');
        continue;
      }

      // Skip common non-page resources
      const pathname = new URL(href).pathname;
      if (/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|ttf|eot|pdf|zip|mp[34])$/i.test(pathname)) {
        skipped.set(normalized, 'resource');
        continue;
      }

      // Skip mailto, tel, javascript
      if (/^(mailto|tel|javascript):/i.test(href)) {
        skipped.set(normalized, 'scheme');
        continue;
      }

      pending.push({ url: href, normalized, depth: depth + 1, source });
      added++;
    }
    return added;
  };

  /**
   * Pop the next URL to visit. Returns undefined if frontier is empty.
   */
  const next = () => {
    const entry = pending.shift();
    if (entry) {
      visited.set(entry.normalized, {
        url: entry.url,
        depth: entry.depth,
        source: entry.source,
      });
    }
    return entry;
  };

  /**
   * Mark URLs as skipped (e.g. by LLM gate).
   */
  const skip = (urls, reason) => {
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      skipped.set(normalized, reason);
    }
    // Remove skipped from pending
    const skippedNorm = new Set(urls.map(normalizeUrl));
    const before = pending.length;
    const filtered = pending.filter((e) => !skippedNorm.has(e.normalized));
    pending.length = 0;
    pending.push(...filtered);
    return before - filtered.length;
  };

  /**
   * Group pending URLs by path prefix for LLM batch decisions.
   */
  const pendingByPrefix = (segments = 2) => {
    const groups = new Map();
    for (const entry of pending) {
      const prefix = pathPrefix(entry.url, segments);
      const group = groups.get(prefix) || [];
      group.push(entry);
      groups.set(prefix, group);
    }
    return groups;
  };

  const size = () => pending.length;
  const visitedCount = () => visited.size;
  const isEmpty = () => pending.length === 0;

  const summary = () => ({
    pending: pending.length,
    visited: visited.size,
    skipped: skipped.size,
    seen: seen.size,
  });

  const visitedUrls = () =>
    [...visited.entries()].map(([norm, data]) => ({
      normalized: norm,
      ...data,
    }));

  const skippedUrls = () =>
    [...skipped.entries()].map(([url, reason]) => ({
      url,
      reason,
    }));

  return {
    addLinks,
    next,
    skip,
    pendingByPrefix,
    size,
    visitedCount,
    isEmpty,
    summary,
    visitedUrls,
    skippedUrls,
    origin,
  };
};

export { normalizeUrl, pathPrefix };
export default createFrontier;
