import { describe, expect, it } from 'vitest';
import createFrontier, { normalizeUrl, pathPrefix } from './frontier.js';

describe('normalizeUrl', () => {
  it('strips fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('strips trailing slash except for root', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('sorts query params for consistent dedup', () => {
    const a = normalizeUrl('https://example.com/page?b=2&a=1');
    const b = normalizeUrl('https://example.com/page?a=1&b=2');
    expect(a).toBe(b);
  });
});

describe('pathPrefix', () => {
  it('extracts first N path segments', () => {
    expect(pathPrefix('https://example.com/app/trips/123/details', 2)).toBe('/app/trips');
    expect(pathPrefix('https://example.com/app/trips/123/details', 1)).toBe('/app');
    expect(pathPrefix('https://example.com/app/trips/123/details', 3)).toBe('/app/trips/123');
  });

  it('handles shallow paths', () => {
    expect(pathPrefix('https://example.com/page', 2)).toBe('/page');
    expect(pathPrefix('https://example.com/', 2)).toBe('/');
  });
});

describe('createFrontier', () => {
  it('starts with the seed URL in the queue', () => {
    const frontier = createFrontier('https://example.com/start');
    expect(frontier.size()).toBe(1);
    expect(frontier.isEmpty()).toBe(false);
  });

  it('next() pops the seed and marks it visited', () => {
    const frontier = createFrontier('https://example.com/start');
    const entry = frontier.next();
    expect(entry.url).toBe('https://example.com/start');
    expect(entry.depth).toBe(0);
    expect(frontier.isEmpty()).toBe(true);
    expect(frontier.visitedCount()).toBe(1);
  });

  it('addLinks enqueues new same-domain URLs', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next(); // pop seed

    const added = frontier.addLinks(
      [{ href: 'https://example.com/page1' }, { href: 'https://example.com/page2' }],
      0,
      'https://example.com/'
    );

    expect(added).toBe(2);
    expect(frontier.size()).toBe(2);
  });

  it('filters external URLs when sameDomain is true', () => {
    const frontier = createFrontier('https://example.com/', { sameDomain: true });
    frontier.next();

    const added = frontier.addLinks(
      [{ href: 'https://example.com/internal' }, { href: 'https://other.com/external' }],
      0,
      'https://example.com/'
    );

    expect(added).toBe(1);
    expect(frontier.size()).toBe(1);
  });

  it('allows external URLs when sameDomain is false', () => {
    const frontier = createFrontier('https://example.com/', { sameDomain: false });
    frontier.next();

    const added = frontier.addLinks(
      [{ href: 'https://other.com/page' }],
      0,
      'https://example.com/'
    );

    expect(added).toBe(1);
  });

  it('deduplicates URLs including fragment and trailing slash variants', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next();

    frontier.addLinks(
      [
        { href: 'https://example.com/page' },
        { href: 'https://example.com/page/' },
        { href: 'https://example.com/page#section' },
      ],
      0,
      'https://example.com/'
    );

    expect(frontier.size()).toBe(1);
  });

  it('enforces maxDepth', () => {
    const frontier = createFrontier('https://example.com/', { maxDepth: 2 });
    frontier.next();

    // depth 0 → children at depth 1
    frontier.addLinks([{ href: 'https://example.com/a' }], 0, '/');
    const entry1 = frontier.next();
    expect(entry1.depth).toBe(1);

    // depth 1 → children at depth 2
    frontier.addLinks([{ href: 'https://example.com/a/b' }], 1, '/a');
    const entry2 = frontier.next();
    expect(entry2.depth).toBe(2);

    // depth 2 → children would be depth 3, exceeds maxDepth=2
    const added = frontier.addLinks([{ href: 'https://example.com/a/b/c' }], 2, '/a/b');
    expect(added).toBe(0);
  });

  it('skips resource URLs (images, css, js, etc.)', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next();

    const added = frontier.addLinks(
      [
        { href: 'https://example.com/style.css' },
        { href: 'https://example.com/script.js' },
        { href: 'https://example.com/logo.png' },
        { href: 'https://example.com/font.woff2' },
        { href: 'https://example.com/real-page' },
      ],
      0,
      '/'
    );

    expect(added).toBe(1);
  });

  it('skip() removes URLs from pending and records reason', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next();

    frontier.addLinks(
      [
        { href: 'https://example.com/a' },
        { href: 'https://example.com/b' },
        { href: 'https://example.com/c' },
      ],
      0,
      '/'
    );
    expect(frontier.size()).toBe(3);

    const removed = frontier.skip(['https://example.com/a', 'https://example.com/c'], 'llm-gate');
    expect(removed).toBe(2);
    expect(frontier.size()).toBe(1);

    const skipped = frontier.skippedUrls();
    expect(skipped.some((s) => s.reason === 'llm-gate')).toBe(true);
  });

  it('pendingByPrefix groups URLs by path prefix', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next();

    frontier.addLinks(
      [
        { href: 'https://example.com/app/trips/1' },
        { href: 'https://example.com/app/trips/2' },
        { href: 'https://example.com/app/settings/profile' },
        { href: 'https://example.com/app/settings/notifications' },
        { href: 'https://example.com/help/faq' },
      ],
      0,
      '/'
    );

    const groups = frontier.pendingByPrefix(2);
    expect(groups.size).toBe(3);
    expect(groups.get('/app/trips').length).toBe(2);
    expect(groups.get('/app/settings').length).toBe(2);
    expect(groups.get('/help/faq').length).toBe(1);
  });

  it('summary() reflects current state', () => {
    const frontier = createFrontier('https://example.com/');
    const s1 = frontier.summary();
    expect(s1.pending).toBe(1);
    expect(s1.visited).toBe(0);

    frontier.next();
    frontier.addLinks(
      [{ href: 'https://example.com/a' }, { href: 'https://example.com/b' }],
      0,
      '/'
    );

    const s2 = frontier.summary();
    expect(s2.pending).toBe(2);
    expect(s2.visited).toBe(1);
    expect(s2.seen).toBe(3);
  });

  it('next() returns undefined when frontier is empty', () => {
    const frontier = createFrontier('https://example.com/');
    frontier.next(); // pop seed
    expect(frontier.next()).toBeUndefined();
  });
});
