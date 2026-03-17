// ── Prompt Piece — Test Helpers ─────────────────────────────────────
// Lightweight piece construction, rendering, tag matching, and routing
// used by example and composition tests. Not part of the public API.
//
// These functions implement the deterministic core behaviors (piece
// construction, marker rendering, AND-matching, pipeline ordering)
// that the UI will also need. When the UI layer is built, these
// should be promoted to a shared module rather than reimplemented.

// ── Markers ─────────────────────────────────────────────────────────
// HTML comment markers for inserting/extracting named sections.

const markerOpen = (id) => `<!-- marker:${id} -->`;
const markerClose = (id) => `<!-- /marker:${id} -->`;
const MARKER_PATTERN = /<!-- marker:([\w-]+) -->\n([\s\S]*?)\n<!-- \/marker:\1 -->/g;

export const extractSections = (prompt) => {
  const sections = [];
  let match;
  const pattern = new RegExp(MARKER_PATTERN.source, MARKER_PATTERN.flags);
  while ((match = pattern.exec(prompt)) !== null) {
    sections.push({ id: match[1], content: match[2] });
  }
  const clean = prompt
    .replace(pattern, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { clean, sections };
};

const toBlock = (section) =>
  `${markerOpen(section.id)}\n${section.content}\n${markerClose(section.id)}`;

const insertSections = (prompt, sections) => {
  const { clean } = extractSections(prompt);
  const prepends = sections.filter((s) => s.placement === 'prepend');
  const appends = sections.filter((s) => s.placement === 'append');
  const parts = [];
  if (prepends.length) parts.push(prepends.map(toBlock).join('\n\n'));
  parts.push(clean);
  if (appends.length) parts.push(appends.map(toBlock).join('\n\n'));
  return parts.join('\n\n');
};

// ── Piece construction ──────────────────────────────────────────────

export const createPiece = (text) => ({ text, inputs: [] });

export const addInput = (piece, input) => ({
  ...piece,
  inputs: [
    ...piece.inputs.filter((i) => i.id !== input.id),
    {
      id: input.id,
      label: input.label ?? input.id,
      placement: input.placement ?? 'prepend',
      tags: input.tags ?? [],
      required: input.required ?? false,
      multi: input.multi ?? false,
    },
  ],
});

// ── Rendering ───────────────────────────────────────────────────────

export const render = (piece, content = {}) => {
  const sections = piece.inputs
    .filter((input) => input.id in content)
    .map((input) => {
      const raw = content[input.id];
      const body = Array.isArray(raw) ? raw.filter(Boolean).join('\n\n') : raw;
      return { id: input.id, placement: input.placement, content: body || `{${input.id}}` };
    });
  return insertSections(piece.text, sections);
};

// ── Tag matching ────────────────────────────────────────────────────
// AND semantics: a source qualifies when it has ALL of an input's tags.

const sourceMatchesInput = (source, input) =>
  input.tags.length > 0 && input.tags.every((t) => source.tags.includes(t));

export const matchSources = (inputs, sources) => {
  const matches = {};
  for (const input of inputs) {
    if (input.tags.length === 0) continue;
    const candidates = sources.filter((s) => sourceMatchesInput(s, input));
    if (input.multi) {
      if (candidates.length > 0)
        matches[input.id] = candidates.map((s) => ({ sourceId: s.id, content: s.content }));
    } else if (candidates.length === 1) {
      matches[input.id] = [{ sourceId: candidates[0].id, content: candidates[0].content }];
    }
  }
  return matches;
};

// ── Inspection ──────────────────────────────────────────────────────

export const pendingInputs = (piece, content = {}) =>
  piece.inputs.filter((i) => i.required && !(i.id in content)).map((i) => i.id);

export const isReady = (piece, content = {}) => pendingInputs(piece, content).length === 0;

// ── Routing ─────────────────────────────────────────────────────────

const tagsMatch = (sourceTags, inputTags) =>
  inputTags.length > 0 && inputTags.every((t) => sourceTags.includes(t));

export const connectParts = (instances) => {
  const edges = [];
  for (const to of instances) {
    for (const input of to.inputs) {
      if (input.tags.length === 0) continue;
      for (const from of instances) {
        if (from.name === to.name) continue;
        if (tagsMatch(from.sourceTags, input.tags))
          edges.push({ from: from.name, to: to.name, inputId: input.id });
      }
    }
  }
  return edges;
};

export const runOrder = (names, edges) => {
  const inDegree = Object.fromEntries(names.map((n) => [n, 0]));
  const adjacency = Object.fromEntries(names.map((n) => [n, new Set()]));
  for (const edge of edges) {
    if (edge.to in inDegree && edge.from in adjacency) adjacency[edge.from].add(edge.to);
  }
  for (const name of names) inDegree[name] = 0;
  for (const name of names) {
    for (const next of adjacency[name]) inDegree[next]++;
  }
  const queue = names.filter((n) => inDegree[n] === 0);
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const next of adjacency[node]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return order;
};

export const detectCycles = (names, edges) => {
  const order = runOrder(names, edges);
  const inOrder = new Set(order);
  const errors = names.filter((n) => !inOrder.has(n)).map((n) => `"${n}" is part of a cycle`);
  return { valid: errors.length === 0, errors };
};
