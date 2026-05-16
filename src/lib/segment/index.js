// Format-agnostic text segmentation.
// Splits documents into typed chunks using structural signals — no markdown/org-mode assumptions.

const MIN_MERGE_WORDS = 40;
const HEADING_MAX_CHARS = 80;
const SIGIL_PATTERN =
  /^(?:\$|#!|import |def |function |class |const |let |if |for |return |export )/;
const SEPARATOR_PATTERN = /^[\s]*[-=*_~#]{3,}\s*$/;
const LIST_PREFIX_PATTERN = /^(\s*(?:[-*+]|\d+[.)]) )/;
const URL_PATTERN = /https?:\/\/[^\s)>\]]+/g;

const CONTENT_TYPES = Object.freeze({
  prose: 'prose',
  code: 'code',
  tabular: 'tabular',
  heading: 'heading',
  list: 'list',
  command: 'command',
  url: 'url',
});

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// --- Line feature extraction ---

function punctuationRatio(line) {
  const chars = line.replace(/\s/g, '');
  if (chars.length === 0) return 0;
  const punct = chars.replace(/[a-zA-Z0-9]/g, '').length;
  return punct / chars.length;
}

function pipeCount(line) {
  return (line.match(/\|/g) || []).length;
}

function leadingWhitespace(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function lineFeatures(line) {
  return {
    pipeDensity: pipeCount(line) / Math.max(line.length, 1),
    punctRatio: punctuationRatio(line),
    indent: leadingWhitespace(line),
    length: line.length,
  };
}

// --- Boundary detection ---

function findBoundaries(lines, detectors) {
  const boundaries = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      boundaries.add(i);
      continue;
    }

    if (SEPARATOR_PATTERN.test(lines[i])) {
      boundaries.add(i);
      continue;
    }

    if (isHeadingLine(lines[i], detectors)) {
      boundaries.add(i);
      if (
        i + 1 < lines.length &&
        !isHeadingLine(lines[i + 1], detectors) &&
        lines[i + 1].trim() !== ''
      ) {
        boundaries.add(i + 1);
      }
      continue;
    }

    if (i > 0 && leadingWhitespace(lines[i]) === 0 && leadingWhitespace(lines[i - 1]) > 0) {
      boundaries.add(i);
      continue;
    }

    if (i > 0 && lines[i].trim() !== '' && lines[i - 1].trim() !== '') {
      const prev = lineFeatures(lines[i - 1]);
      const curr = lineFeatures(lines[i]);
      let shifts = 0;
      if (Math.abs(prev.pipeDensity - curr.pipeDensity) > 0.1) shifts++;
      if (Math.abs(prev.punctRatio - curr.punctRatio) > 0.25) shifts++;
      if (Math.abs(prev.indent - curr.indent) > 4) shifts++;
      if (Math.abs(prev.length - curr.length) > prev.length * 0.6 && prev.length > 10) shifts++;
      if (shifts >= 2) boundaries.add(i);
    }
  }

  return boundaries;
}

// --- Content type classification ---

function classifyLines(lines, detectors) {
  if (lines.length === 0) return CONTENT_TYPES.prose;
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length === 0) return CONTENT_TYPES.prose;

  // Tabular: high pipe density or consistent tab/whitespace alignment
  const pipey = nonEmpty.filter((l) => pipeCount(l) >= 2);
  if (pipey.length / nonEmpty.length > 0.5) return CONTENT_TYPES.tabular;

  // URL: majority of content is URLs (check before heading — single-line URLs look like headings)
  const joined = nonEmpty.join(' ');
  const urlMatches = joined.match(URL_PATTERN) || [];
  const urlCharLen = urlMatches.reduce((s, u) => s + u.length, 0);
  if (urlCharLen / joined.length > 0.6) return CONTENT_TYPES.url;

  // Heading: single short line with heading-like syntax
  if (nonEmpty.length === 1 && isHeadingLine(nonEmpty[0], detectors)) {
    return CONTENT_TYPES.heading;
  }

  // Command: lines starting with shell sigils (exclude markdown headings)
  const isMarkdownHeading = (l) => /^\s*#{1,6}\s/.test(l);
  const commandy = nonEmpty.filter(
    (l) =>
      /^\s*[$>]\s/.test(l) || (/^\s*#\s/.test(l) && !isMarkdownHeading(l)) || /^\s*sudo\s/.test(l)
  );
  if (commandy.length / nonEmpty.length > 0.5) return CONTENT_TYPES.command;

  // Code: high punctuation ratio, short tokens, sigil patterns
  const cody = nonEmpty.filter((l) => punctuationRatio(l) > 0.3 || SIGIL_PATTERN.test(l.trim()));
  if (cody.length / nonEmpty.length > 0.5) return CONTENT_TYPES.code;

  // List: repeating prefix pattern
  const listy = nonEmpty.filter((l) => LIST_PREFIX_PATTERN.test(l));
  if (listy.length / nonEmpty.length > 0.6) return CONTENT_TYPES.list;

  return CONTENT_TYPES.prose;
}

// --- Textual proxy generation ---

function extractIdentifiers(text) {
  const ids = text.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]{2,}\b/g) || [];
  return [...new Set(ids)].slice(0, 8);
}

function proxyForTabular(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return text;
  const header = lines[0];
  const dataRows = lines.length - 1;
  const samples = lines.slice(1, 4).join('; ');
  return `[Table: ${dataRows} rows. Header: ${header.trim()}. Sample: ${samples}]`;
}

function proxyForCode(text) {
  const ids = extractIdentifiers(text);
  const firstComment = text.match(/(?:\/\/|#)\s*(.+)/)?.[1] || '';
  const pattern = /\bclass\b/.test(text)
    ? 'class'
    : /\bfunction\b|\bdef\b|=>/.test(text)
      ? 'function'
      : /\bimport\b|\brequire\b/.test(text)
        ? 'imports'
        : 'code';
  return `[Code: ${pattern}. Names: ${ids.join(', ')}${firstComment ? `. ${firstComment}` : ''}]`;
}

function proxyForCommand(text) {
  const verbs = text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) =>
      l
        .trim()
        .replace(/^\s*[$#>]\s*/, '')
        .split(/\s+/)
        .slice(0, 3)
        .join(' ')
    )
    .slice(0, 4);
  return `[Commands: ${verbs.join(', ')}]`;
}

function proxyForUrl(text) {
  const urls = text.match(URL_PATTERN) || [];
  const domains = [
    ...new Set(
      urls.map((u) => {
        try {
          return new URL(u).hostname;
        } catch {
          return u.slice(0, 30);
        }
      })
    ),
  ].slice(0, 4);
  return `[References: ${domains.join(', ')}]`;
}

function generateProxy(text, type) {
  switch (type) {
    case CONTENT_TYPES.tabular:
      return proxyForTabular(text);
    case CONTENT_TYPES.code:
      return proxyForCode(text);
    case CONTENT_TYPES.command:
      return proxyForCommand(text);
    case CONTENT_TYPES.url:
      return proxyForUrl(text);
    default:
      return text;
  }
}

// --- Heading detectors (composable, exported) ---

export function hashHeading(line) {
  return /^#{1,6}\s/.test(line.trim());
}

export function multiHashHeading(line) {
  return /^#{2,6}\s/.test(line.trim());
}

export function allCapsHeading(line) {
  const t = line.trim();
  return t.length > 2 && t.length <= HEADING_MAX_CHARS && /^[A-Z][A-Z\s]{2,}$/.test(t);
}

export function orgStarHeading(line) {
  return /^[*]+\s/.test(line.trim());
}

export function underlineHeading(line, nextLine) {
  if (!nextLine) return false;
  const t = nextLine.trim();
  return line.trim().length > 0 && line.trim().length <= HEADING_MAX_CHARS && /^[-=]{3,}$/.test(t);
}

const DEFAULT_HEADING_DETECTORS = [hashHeading, allCapsHeading, orgStarHeading];

function isHeadingLine(line, detectors = DEFAULT_HEADING_DETECTORS) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > HEADING_MAX_CHARS) return false;
  return detectors.some((d) => d(trimmed));
}

function extractHeadingLevel(line) {
  const hashMatch = line.match(/^(#{1,6})\s/);
  if (hashMatch) return hashMatch[1].length;
  if (/^[A-Z][A-Z\s]{2,}$/.test(line.trim())) return 1;
  if (/^[*]+\s/.test(line.trim())) {
    const starMatch = line.match(/^([*]+)\s/);
    return starMatch ? starMatch[1].length : 2;
  }
  return 2;
}

// --- Main segment function ---

export default function segment(document, { headingDetectors } = {}) {
  if (!document || document.length === 0) return [];

  const detectors = headingDetectors ?? DEFAULT_HEADING_DETECTORS;
  const lines = document.split('\n');
  const boundaries = findBoundaries(lines, detectors);

  // Split into raw segments at boundaries
  const rawSegments = [];
  let start = 0;

  for (let i = 0; i < lines.length; i++) {
    if (boundaries.has(i) && i > start) {
      rawSegments.push({ lines: lines.slice(start, i), startLine: start });
      start = i;
    }
    // Skip blank lines at boundary
    if (boundaries.has(i) && lines[i].trim() === '') {
      start = i + 1;
    }
  }
  if (start < lines.length) {
    rawSegments.push({ lines: lines.slice(start), startLine: start });
  }

  // Classify each segment
  const classified = rawSegments
    .filter((seg) => seg.lines.some((l) => l.trim()))
    .map((seg) => {
      const text = seg.lines.join('\n');
      const type = classifyLines(seg.lines, detectors);
      return { text, type, startLine: seg.startLine };
    });

  // Merge adjacent same-type chunks under MIN_MERGE_WORDS
  // Never merge headings, and never merge across a heading boundary
  const merged = [];
  for (const seg of classified) {
    const prev = merged.at(-1);
    if (
      prev &&
      prev.type === seg.type &&
      prev.type !== CONTENT_TYPES.heading &&
      seg.type !== CONTENT_TYPES.heading &&
      countWords(prev.text) < MIN_MERGE_WORDS
    ) {
      prev.text += `\n${seg.text}`;
    } else {
      merged.push({ ...seg });
    }
  }

  // Keep headings as separate chunks but also record them on the following chunk
  const attached = [];
  for (let i = 0; i < merged.length; i++) {
    if (merged[i].type === CONTENT_TYPES.heading && i + 1 < merged.length) {
      attached.push(merged[i]);
      merged[i + 1].attachedHeading = merged[i].text.trim();
    } else {
      attached.push(merged[i]);
    }
  }

  // Build heading path and compute positions
  const headingStack = [];
  let charOffset = 0;

  return attached.map((seg) => {
    // Update heading stack from any heading lines in this segment
    const segLines = seg.text.split('\n');
    for (const line of segLines) {
      if (isHeadingLine(line, detectors)) {
        const level = extractHeadingLevel(line);
        while (headingStack.length >= level) headingStack.pop();
        headingStack.push(line.trim().replace(/^#+\s*/, ''));
      }
    }

    const text = seg.text;
    const proxy = generateProxy(text, seg.type);
    const position = charOffset;
    charOffset += text.length + 1; // +1 for the newline between segments

    return {
      text,
      proxy,
      type: seg.type,
      position,
      wordCount: countWords(text),
      headingPath: headingStack.length > 0 ? headingStack.join('/') : undefined,
    };
  });
}

export { CONTENT_TYPES, DEFAULT_HEADING_DETECTORS };
