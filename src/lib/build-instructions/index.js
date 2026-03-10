import { asXML } from '../../prompts/wrap-variable.js';

/**
 * Create the 5 standard instruction builder functions for a chain's
 * spec/apply/create pattern.
 *
 * Every chain that exposes `mapInstructions`, `filterInstructions`, etc.
 * follows the same structural template — only the XML tag name and
 * domain-specific text differ. This factory captures that template once.
 *
 * @param {object} config
 * @param {string} config.specTag - XML tag name for the specification
 * @param {object} config.defaults - Default instructions when no processing is provided
 * @param {string} config.defaults.map
 * @param {string} config.defaults.filter
 * @param {string} config.defaults.find
 * @param {string} config.defaults.group
 * @param {object} config.steps - Process step descriptions per operation
 * @param {string} config.steps.reduce
 * @param {string} config.steps.filter
 * @param {string} config.steps.find
 * @param {string} config.steps.group
 * @param {string} [config.mapApplyLine] - Text before spec XML in map (processing branch only)
 * @param {object} [config.mapSuffix] - Text after spec XML in map
 * @param {string} [config.mapSuffix.processing] - Suffix when processing provided
 * @param {string} [config.mapSuffix.default] - Suffix when using default
 * @param {object} [config.specIntro] - Text before spec XML (both branches for filter/find/group)
 * @param {string} [config.specIntro.filter]
 * @param {string} [config.specIntro.reduce]
 * @param {string} [config.specIntro.find]
 * @param {string} [config.specIntro.group]
 * @param {string} [config.reduceDefault] - Fallback processing text for reduce
 * @returns {{ mapInstructions, filterInstructions, reduceInstructions, findInstructions, groupInstructions }}
 */
export default function buildInstructions({
  specTag,
  defaults,
  steps,
  mapApplyLine,
  mapSuffix,
  specIntro = {},
  reduceDefault,
}) {
  const specXML = (specification) => asXML(specification, { tag: specTag });

  // For filter/find/group/reduce: intro appears before spec XML in all branches.
  // When absent, just a blank-line separator.
  const intro = (op) => (specIntro[op] ? `\n\n${specIntro[op]}\n` : '\n\n');

  return {
    mapInstructions({ specification, processing }) {
      if (processing) {
        const applyLine = mapApplyLine ? `\n\n${mapApplyLine}\n` : '\n\n';
        const base = `${asXML(processing, { tag: 'processing-instructions' })}${applyLine}${specXML(specification)}`;
        return mapSuffix?.processing ? `${base}\n\n${mapSuffix.processing}` : base;
      }
      const base = `${defaults.map}\n\n${specXML(specification)}`;
      return mapSuffix?.default ? `${base}\n\n${mapSuffix.default}` : base;
    },

    filterInstructions({ specification, processing }) {
      if (processing) {
        return `${asXML(processing, { tag: 'filter-criteria' })}\n\n${steps.filter}${intro('filter')}${specXML(specification)}`;
      }
      return `${defaults.filter}${intro('filter')}${specXML(specification)}`;
    },

    reduceInstructions({ specification, processing }) {
      const proc = reduceDefault ? processing || reduceDefault : processing;
      return `${asXML(proc, { tag: 'reduce-operation' })}\n\n${steps.reduce}${intro('reduce')}${specXML(specification)}`;
    },

    findInstructions({ specification, processing }) {
      if (processing) {
        return `${asXML(processing, { tag: 'selection-criteria' })}\n\n${steps.find}${intro('find')}${specXML(specification)}`;
      }
      return `${defaults.find}${intro('find')}${specXML(specification)}`;
    },

    groupInstructions({ specification, processing }) {
      if (processing) {
        return `${asXML(processing, { tag: 'grouping-strategy' })}\n\n${steps.group}${intro('group')}${specXML(specification)}`;
      }
      return `${defaults.group}${intro('group')}${specXML(specification)}`;
    },
  };
}
