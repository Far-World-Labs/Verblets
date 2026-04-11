/* eslint-disable no-undef */
/**
 * Page data extraction — pulls links, forms, buttons, scripts, meta,
 * structural patterns, and data attributes from a Playwright page.
 *
 * All functions run page.evaluate() and return plain serializable objects.
 */

/**
 * Extract all links with categorization.
 */
const extractLinks = async (page, baseOrigin) => {
  const raw = await page.evaluate(() => {
    const seen = new Set();
    return [...document.querySelectorAll('a[href]')]
      .map((a) => {
        const href = a.href;
        if (seen.has(href)) return undefined;
        seen.add(href);
        const rect = a.getBoundingClientRect();
        return {
          href,
          text: a.textContent?.trim()?.slice(0, 120) || '',
          ariaLabel: a.getAttribute('aria-label') || '',
          rel: a.getAttribute('rel') || '',
          target: a.getAttribute('target') || '',
          isVisible: rect.width > 0 && rect.height > 0,
          classes: a.className?.slice?.(0, 120) || '',
          dataAttrs: Object.fromEntries(
            [...a.attributes]
              .filter((attr) => attr.name.startsWith('data-'))
              .map((attr) => [attr.name, attr.value?.slice(0, 80)])
          ),
          inNav: !!a.closest('nav, [role="navigation"], header'),
          inFooter: !!a.closest('footer'),
          inMain: !!a.closest('main, [role="main"], #main, .main-content'),
        };
      })
      .filter(Boolean);
  });

  return raw.map((link) => ({
    ...link,
    isExternal: !link.href.startsWith(baseOrigin),
    isSameDomain: link.href.startsWith(baseOrigin),
    isAnchor:
      link.href.includes('#') && new URL(link.href).pathname === new URL(page.url()).pathname,
  }));
};

/**
 * Extract all forms with their fields.
 */
const extractForms = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('form')].map((form) => ({
      action: form.action || '',
      method: (form.method || 'GET').toUpperCase(),
      id: form.id || '',
      name: form.name || '',
      classes: form.className?.slice?.(0, 120) || '',
      enctype: form.enctype || '',
      dataAttrs: Object.fromEntries(
        [...form.attributes]
          .filter((attr) => attr.name.startsWith('data-'))
          .map((attr) => [attr.name, attr.value?.slice(0, 80)])
      ),
      fields: [...form.querySelectorAll('input, select, textarea, button')].map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        label: (
          el.labels?.[0]?.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.placeholder ||
          ''
        )?.slice(0, 80),
        required: el.required || el.getAttribute('aria-required') === 'true',
        value: el.type === 'hidden' ? el.value?.slice(0, 80) : '',
        options:
          el.tagName === 'SELECT'
            ? [...el.options].slice(0, 20).map((o) => ({
                value: o.value,
                text: o.textContent?.trim()?.slice(0, 60),
              }))
            : undefined,
      })),
    }))
  );

/**
 * Extract interactive elements: buttons, clickable elements with handlers.
 */
const extractButtons = (page) =>
  page.evaluate(() => {
    const buttons = [
      ...document.querySelectorAll(
        'button, [role="button"], input[type="button"], input[type="submit"]'
      ),
    ];
    const clickable = [
      ...document.querySelectorAll('[onclick], [data-action], [data-toggle], [data-target]'),
    ];
    const all = [...new Set([...buttons, ...clickable])];

    return all.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        text: el.textContent?.trim()?.slice(0, 80) || '',
        id: el.id || '',
        classes: (typeof el.className === 'string'
          ? el.className
          : el.className?.baseVal || ''
        ).slice(0, 120),
        ariaLabel: el.getAttribute('aria-label') || '',
        isVisible: rect.width > 0 && rect.height > 0,
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
        hasOnclick: !!el.getAttribute('onclick'),
        onclick: el.getAttribute('onclick')?.slice(0, 120) || '',
        dataAttrs: Object.fromEntries(
          [...el.attributes]
            .filter((attr) => attr.name.startsWith('data-'))
            .map((attr) => [attr.name, attr.value?.slice(0, 80)])
        ),
      };
    });
  });

/**
 * Extract script tags and inline script patterns.
 */
const extractScripts = (page) =>
  page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script')];
    return scripts.map((s) => ({
      src: s.src || '',
      type: s.type || '',
      isModule: s.type === 'module',
      isInline: !s.src,
      size: s.textContent?.length || 0,
      // First 200 chars of inline scripts to identify patterns
      preview: !s.src ? s.textContent?.trim()?.slice(0, 200) : '',
    }));
  });

/**
 * Extract page metadata: title, meta tags, OpenGraph, etc.
 */
const extractMeta = (page) =>
  page.evaluate(() => {
    const getMeta = (name) =>
      document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || '';

    return {
      title: document.title || '',
      description: getMeta('description'),
      viewport: getMeta('viewport'),
      charset: document.characterSet || '',
      generator: getMeta('generator'),
      ogTitle: getMeta('og:title'),
      ogType: getMeta('og:type'),
      ogImage: getMeta('og:image'),
      csrfToken: document.querySelector('meta[name="csrf-token"], meta[name="_token"]')?.content
        ? '(present)'
        : '',
      customMeta: [...document.querySelectorAll('meta[name], meta[property]')]
        .filter(
          (m) =>
            ![
              'description',
              'viewport',
              'generator',
              'og:title',
              'og:type',
              'og:image',
              'csrf-token',
            ].includes(m.getAttribute('name') || m.getAttribute('property'))
        )
        .slice(0, 20)
        .map((m) => ({
          name: m.getAttribute('name') || m.getAttribute('property'),
          content: m.content?.slice(0, 120),
        })),
    };
  });

/**
 * Extract structural patterns: headings, landmarks, data attributes, CSS frameworks.
 */
const extractStructure = (page) =>
  page.evaluate(() => {
    // Headings hierarchy
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .slice(0, 30)
      .map((h) => ({
        level: parseInt(h.tagName[1], 10),
        text: h.textContent?.trim()?.slice(0, 100),
      }));

    // ARIA landmarks
    const landmarks = [
      ...document.querySelectorAll(
        '[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], nav, main, aside, header, footer'
      ),
    ].map((el) => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      id: el.id || '',
      classes: (typeof el.className === 'string'
        ? el.className
        : el.className?.baseVal || ''
      ).slice(0, 80),
    }));

    // Unique data-* attribute names across the page
    const dataAttrNames = new Set();
    document.querySelectorAll('*').forEach((el) => {
      [...el.attributes]
        .filter((a) => a.name.startsWith('data-'))
        .forEach((a) => dataAttrNames.add(a.name));
    });

    // CSS framework detection
    const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
    const classNames = new Set();
    const gcn = (el) => {
      const c = el.className;
      return typeof c === 'string' ? c : c?.baseVal || '';
    };
    document.querySelectorAll('[class]').forEach((el) => {
      gcn(el)
        .split(/\s+/)
        .slice(0, 5)
        .forEach((c) => {
          if (c) classNames.add(c);
        });
    });
    const classArray = [...classNames].slice(0, 200);

    // Detect frameworks/libraries from globals
    const globals = {};
    const checks = [
      'jQuery',
      '$',
      'React',
      'ReactDOM',
      'Vue',
      'angular',
      'ng',
      'Ember',
      'Backbone',
      'Handlebars',
      'Mustache',
      '_',
      'Lodash',
      'moment',
      'require',
      'define',
      'webpack',
      '__NEXT_DATA__',
      '__NUXT__',
      'Turbolinks',
      'Turbo',
      'htmx',
      'Alpine',
    ];
    for (const name of checks) {
      try {
        if (window[name] !== undefined) {
          const val = window[name];
          globals[name] =
            typeof val === 'function'
              ? val.fn?.jquery || val.version || 'present'
              : typeof val === 'object'
                ? 'present'
                : String(val).slice(0, 40);
        }
      } catch {
        /* cross-origin or getter error */
      }
    }

    // Inline event handlers (progressive enhancement indicator)
    const inlineHandlers = new Set();
    const handlerAttrs = [
      'onclick',
      'onsubmit',
      'onchange',
      'onload',
      'oninput',
      'onfocus',
      'onblur',
      'onkeyup',
      'onkeydown',
    ];
    for (const attr of handlerAttrs) {
      if (document.querySelectorAll(`[${attr}]`).length > 0) {
        inlineHandlers.add(attr);
      }
    }

    return {
      headings,
      landmarks,
      dataAttributes: Array.from(dataAttrNames).toSorted().slice(0, 100),
      stylesheets: stylesheets.slice(0, 20),
      sampleClasses: classArray,
      globals,
      inlineHandlers: [...inlineHandlers],
      iframeCount: document.querySelectorAll('iframe').length,
      shadowRootCount: [...document.querySelectorAll('*')].filter((el) => el.shadowRoot).length,
    };
  });

/**
 * Full page extraction — returns everything interesting about the current page.
 */
const extractPage = async (page) => {
  const url = page.url();
  const origin = new URL(url).origin;

  const [links, forms, buttons, scripts, meta, structure] = await Promise.all([
    extractLinks(page, origin),
    extractForms(page),
    extractButtons(page),
    extractScripts(page),
    extractMeta(page),
    extractStructure(page),
  ]);

  return { url, links, forms, buttons, scripts, meta, structure };
};

export {
  extractLinks,
  extractForms,
  extractButtons,
  extractScripts,
  extractMeta,
  extractStructure,
};
export default extractPage;
