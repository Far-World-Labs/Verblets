// ── Prompt Markers ──────────────────────────────────────────────────
// General-purpose utility for inserting, extracting, and inspecting
// marked sections in prompts.
// Markers: <!-- marker:id -->...\n<!-- /marker:id -->
// Slots:   {{slot_name}} placeholders inside marker content
// Idempotent: inserting a section with an existing id replaces it.

const markerOpen = (id) => `<!-- marker:${id} -->`;
const markerClose = (id) => `<!-- /marker:${id} -->`;
const MARKER_PATTERN = /<!-- marker:([\w-]+) -->\n([\s\S]*?)\n<!-- \/marker:\1 -->/g;
const SLOT_PATTERN = /\{\{(\w+)\}\}/g;

// ── Section operations ──────────────────────────────────────────────

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

export const insertSections = (prompt, sections) => {
  const { clean } = extractSections(prompt);

  const prepends = sections.filter((s) => s.placement === 'prepend');
  const appends = sections.filter((s) => s.placement === 'append');

  const parts = [];
  if (prepends.length) parts.push(prepends.map(toBlock).join('\n\n'));
  parts.push(clean);
  if (appends.length) parts.push(appends.map(toBlock).join('\n\n'));

  return parts.join('\n\n');
};

// ── Slot operations ─────────────────────────────────────────────────

export const listSlots = (prompt) => {
  const slots = [];
  let match;
  const pattern = new RegExp(SLOT_PATTERN.source, SLOT_PATTERN.flags);
  while ((match = pattern.exec(prompt)) !== null) {
    if (!slots.includes(match[1])) slots.push(match[1]);
  }
  return slots;
};

export const fillSlots = (prompt, bindings) =>
  prompt.replace(SLOT_PATTERN, (original, name) => (name in bindings ? bindings[name] : original));

// ── Inspection ──────────────────────────────────────────────────────

export const inspectPrompt = (prompt) => {
  const { clean, sections } = extractSections(prompt);
  const slots = listSlots(prompt);
  return { clean, sections, slots };
};

// ── Diff ────────────────────────────────────────────────────────────

export const diffPrompts = (before, after) => {
  const { clean: cleanBefore, sections: secBefore } = extractSections(before);
  const { clean: cleanAfter, sections: secAfter } = extractSections(after);

  const beforeMap = new Map(secBefore.map((s) => [s.id, s.content]));
  const afterMap = new Map(secAfter.map((s) => [s.id, s.content]));

  const added = secAfter.filter((s) => !beforeMap.has(s.id));
  const removed = secBefore.filter((s) => !afterMap.has(s.id));
  const updated = secAfter.filter((s) => beforeMap.has(s.id) && beforeMap.get(s.id) !== s.content);
  const unchanged = secAfter.filter(
    (s) => beforeMap.has(s.id) && beforeMap.get(s.id) === s.content
  );

  return { coreChanged: cleanBefore !== cleanAfter, added, removed, updated, unchanged };
};
