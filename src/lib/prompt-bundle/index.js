// ── Prompt Bundle ───────────────────────────────────────────────────
// A prompt bundle is a plain data object: the clean base prompt,
// accepted extensions, and slot bindings. The filled prompt string
// is a derived artifact computed by buildPrompt(). All functions are
// pure and return new bundles — no mutation.
//
// Bundle shape:
// { base: string, extensions: Extension[], bindings: Record<string, string>,
//   description?: { purpose, inputs, outputs, qualities, gaps } }

import { extractSections, insertSections, listSlots, fillSlots } from '../prompt-markers/index.js';

// ── Creation ────────────────────────────────────────────────────────

export const createBundle = (base) => ({
  base,
  extensions: [],
  bindings: {},
  description: undefined,
});

// Reverse of buildPrompt — creates a bundle from a prompt string that
// may already contain markers and slots. Extensions get id, placement,
// preamble, and slot (if detected). Metadata fields (need, effort, etc.)
// are not present in prompt text and are omitted.

export const parseBundle = (prompt) => {
  const { clean, sections } = extractSections(prompt);
  const firstCoreLine = clean.split('\n').find((line) => line.trim());
  const coreStart = firstCoreLine ? prompt.indexOf(firstCoreLine) : prompt.length;

  const extensions = sections.map((section) => {
    const markerPos = prompt.indexOf(`<!-- marker:${section.id} -->`);
    const slots = listSlots(section.content);
    return {
      id: section.id,
      placement: markerPos < coreStart ? 'prepend' : 'append',
      preamble: section.content,
      ...(slots.length > 0 ? { slot: slots[0] } : {}),
    };
  });

  return addExtensions(createBundle(clean), extensions);
};

// ── Mutation (returns new bundle) ───────────────────────────────────

export const addExtensions = (bundle, extensions) => {
  const merged = new Map(bundle.extensions.map((e) => [e.id, e]));
  for (const ext of extensions) merged.set(ext.id, ext);
  return { ...bundle, extensions: [...merged.values()] };
};

export const removeExtensions = (bundle, ids) => {
  const idSet = new Set(ids);
  const removedSlots = new Set(bundle.extensions.filter((e) => idSet.has(e.id)).map((e) => e.slot));
  const bindings = { ...bundle.bindings };
  for (const slot of removedSlots) delete bindings[slot];
  return {
    ...bundle,
    extensions: bundle.extensions.filter((e) => !idSet.has(e.id)),
    bindings,
  };
};

export const bind = (bundle, bindings) => ({
  ...bundle,
  bindings: { ...bundle.bindings, ...bindings },
});

export const unbind = (bundle, slotNames) => {
  const bindings = { ...bundle.bindings };
  for (const name of slotNames) delete bindings[name];
  return { ...bundle, bindings };
};

export const setDescription = (bundle, description) => ({
  ...bundle,
  description,
});

// ── Derivation ──────────────────────────────────────────────────────

const toSection = (ext) => ({
  id: ext.id,
  placement: ext.placement,
  content: ext.preamble,
});

export const buildPrompt = (bundle) => {
  const withMarkers = insertSections(bundle.base, bundle.extensions.map(toSection));
  return fillSlots(withMarkers, bundle.bindings);
};

// ── Inspection ──────────────────────────────────────────────────────

export const inspectBundle = (bundle) => ({
  base: bundle.base,
  extensionCount: bundle.extensions.length,
  pendingSlots: pendingSlots(bundle),
  filledSlots: Object.keys(bundle.bindings),
  described: bundle.description !== undefined,
});

export const extensionStatus = (bundle) =>
  bundle.extensions.map((ext) => ({
    ...ext,
    status: ext.slot in bundle.bindings ? 'filled' : 'unfilled',
  }));

export const pendingSlots = (bundle) =>
  bundle.extensions.filter((ext) => !(ext.slot in bundle.bindings)).map((ext) => ext.slot);

// ── Curried pipe helpers ─────────────────────────────────────────────
// Config-first, bundle-last — for use with pipe().
// Follows the same pattern as pick(keys)(obj) in pure/index.js.

export const withExtensions = (extensions) => (bundle) => addExtensions(bundle, extensions);
export const withoutExtensions = (ids) => (bundle) => removeExtensions(bundle, ids);
export const withBindings = (bindings) => (bundle) => bind(bundle, bindings);
export const withoutBindings = (slots) => (bundle) => unbind(bundle, slots);
export const withDescription = (description) => (bundle) => setDescription(bundle, description);

// ── Comparison ──────────────────────────────────────────────────────

export const diffBundles = (before, after) => {
  const beforeIds = new Set(before.extensions.map((e) => e.id));
  const afterIds = new Set(after.extensions.map((e) => e.id));

  const allBindingKeys = new Set([...Object.keys(before.bindings), ...Object.keys(after.bindings)]);

  const bindingsAdded = [];
  const bindingsRemoved = [];
  const bindingsChanged = [];
  for (const key of allBindingKeys) {
    const inBefore = key in before.bindings;
    const inAfter = key in after.bindings;
    if (!inBefore && inAfter) bindingsAdded.push(key);
    else if (inBefore && !inAfter) bindingsRemoved.push(key);
    else if (before.bindings[key] !== after.bindings[key]) bindingsChanged.push(key);
  }

  return {
    baseChanged: before.base !== after.base,
    extensionsAdded: after.extensions.filter((e) => !beforeIds.has(e.id)),
    extensionsRemoved: before.extensions.filter((e) => !afterIds.has(e.id)),
    bindingsAdded,
    bindingsRemoved,
    bindingsChanged,
  };
};
