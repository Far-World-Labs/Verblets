import { v4 as uuid } from 'uuid';

import callLlm, { jsonSchema } from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { resolveTexts } from '../../lib/instruction/index.js';
import { outputSuccinctNames } from '../../prompts/index.js';
import { subComponentsSchema, componentOptionsSchema } from './schemas.js';
import { nameStep, getOptions, withPolicy } from '../../lib/context/option.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { DomainEvent, Outcome } from '../../lib/progress/constants.js';

const _name = 'dismantle';

// ===== Option Mappers =====

const DEFAULT_DECOMPOSE_PENALTY = 0.7;
const DEFAULT_ENHANCE_PENALTY = 0.5;

/**
 * Map variety option to a frequency penalty. Accepts 'low'|'high' or a raw number.
 * When set, enhance penalty is derived as `withPolicy * 0.7`.
 * @param {string|number|undefined} value
 * @returns {number|undefined} Frequency penalty for decompose (undefined = use defaults)
 */
export const mapVariety = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return { low: 0.3, med: undefined, high: 0.9 }[value];
};

const subComponentsPrompt = (component, thing, fixes = '') => {
  let focus = '';
  if (component !== thing) {
    focus = `"${component}" within "${thing}"`;
  } else {
    focus = thing;
  }

  return `Exhaustively enumerate all physical and logical subcomponents of ${focus}, including containers or abstract components.

Apply the specifics listed here when dealing with component or entity:
 - ${outputSuccinctNames()}
 - If some components are subcomponents of others in the list, don't include them.
 - The output must not include "${thing}" or "${component}" in the list.
 - Only subcomponents, no accessories.
${fixes}`;
};

const componentOptionsPrompt = (component, thing, fixes = '') => {
  let focus = '';
  if (component !== thing) {
    focus = `Considering "${component}" as a separate component within "${thing}" entity`;
  } else {
    focus = `Considering "${component}"`;
  }
  return `${focus}, list specific variants for this component. Only provide known variants, don't speculate. Output an empty list if you must.

Apply the specifics listed here when dealing with component or entity:
 - ${outputSuccinctNames()}
 - Do not list subcomponents, that's not what this is about.
${fixes}`;
};

const defaultMatch = () => false;

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const search = (node, { match = defaultMatch, matches = [] } = {}) => {
  if (match(node)) {
    matches.push(node);
  }

  if (!node.children) {
    return matches.length > 0 ? matches : undefined;
  }

  for (const child of node.children) {
    search(child, { match, matches });
  }

  return matches.length > 0 ? matches : undefined;
};

// Both schemas auto-unwrap `items` to a string[]. Anything else means the
// LLM violated the contract — surface honestly so .map and .[0] indexing
// don't propagate undefined silently into the tree.
const validateStringArray = (value, label) => {
  if (!Array.isArray(value)) {
    throw new Error(
      `dismantle: expected string array from ${label} LLM (got ${
        value === null ? 'null' : typeof value
      })`
    );
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`dismantle: ${label} array must contain only strings (got ${typeof item})`);
    }
  }
};

const defaultDecompose = async ({
  name,
  focus,
  rootName,
  fixes,
  llm,
  config,
  temperature,
  variety,
  bundleContext = '',
} = {}) => {
  const focusFormatted = focus ? `: ${focus}` : '';

  const promptParts = [
    subComponentsPrompt(`${name}${focusFormatted}`, rootName, fixes),
    bundleContext,
  ];
  const promptCreated = promptParts.filter(Boolean).join('\n\n');
  const result = await retry(
    () =>
      callLlm(promptCreated, {
        ...config,
        llm,
        frequencyPenalty: variety ?? DEFAULT_DECOMPOSE_PENALTY,
        temperature: temperature ?? 0.7,
        responseFormat: jsonSchema('subcomponents', subComponentsSchema),
      }),
    {
      label: 'dismantle-decompose',
      config,
    }
  );
  validateStringArray(result, 'decompose');
  return result;
};

const defaultEnhance = async ({
  name,
  rootName,
  fixes,
  llm,
  config,
  temperature,
  variety,
  bundleContext = '',
} = {}) => {
  const promptParts = [componentOptionsPrompt(name, rootName, fixes), bundleContext];
  const promptCreated = promptParts.filter(Boolean).join('\n\n');
  const enhanceVariety = variety ? variety * 0.7 : DEFAULT_ENHANCE_PENALTY;
  const result = await retry(
    () =>
      callLlm(promptCreated, {
        ...config,
        llm,
        frequencyPenalty: enhanceVariety,
        temperature: temperature ?? 0.3,
        responseFormat: jsonSchema('component_options', componentOptionsSchema),
      }),
    {
      label: 'dismantle-enhance',
      config,
    }
  );
  validateStringArray(result, 'enhance');
  const options = result;

  return {
    name,
    options,
    topOptionName: options[0],
  };
};

const makeNode = async ({
  node = {},
  name: nameInitial,
  rootName,
  decompose = defaultDecompose,
  enhance = defaultEnhance,
  llm,
  makeId = uuid,
  enhanceFixes,
  decomposeFixes,
  config,
  variety,
  now,
} = {}) => {
  try {
    const name = nameInitial ?? rootName;

    let nodeNew = node;

    if (!node.isEnhanced) {
      nodeNew = await enhance({
        name,
        rootName,
        fixes: enhanceFixes,
        llm,
        config,
        variety,
        now,
      });
      nodeNew.isEnhanced = true;

      const focus = node.options?.[0];

      const childNames = await decompose({
        name,
        focus,
        rootName,
        fixes: decomposeFixes,
        llm,
        config,
        variety,
        now,
      });
      nodeNew.children = childNames.map((childName) => ({
        id: makeId(),
        name: childName,
      }));
    }

    if (!node.id) {
      nodeNew.id = makeId();
    }

    return {
      ...node,
      ...nodeNew,
    };
  } catch (err) {
    const nodeName = nameInitial ?? rootName;
    err.message = `makeNode(${nodeName}): ${err.message}`;
    throw err;
  }
};

const makeSubtree = async ({
  name,
  rootName,
  tree: treeInitial,
  depth = 0,
  decompose,
  enhance,
  llm,
  enhanceFixes,
  decomposeFixes,
  makeId,
  config,
  variety,
  now,
} = {}) => {
  try {
    let tree = { ...(treeInitial ?? {}) };

    const nodeNew = await makeNode({
      node: tree,
      name: name ?? tree.name,
      rootName,
      enhance,
      decompose,
      llm,
      makeId,
      enhanceFixes,
      decomposeFixes,
      config,
      variety,
      now,
    });

    tree = {
      ...tree,
      ...nodeNew,
    };

    if (depth <= 0) {
      return tree;
    }

    const children = [];
    for (const child of tree.children) {
      // eslint-disable-next-line no-await-in-loop
      const subtree = await makeSubtree({
        tree: child,
        rootName,
        decompose,
        enhance,
        llm,
        depth: depth - 1,
        makeId,
        enhanceFixes,
        decomposeFixes,
        config,
        variety,
        now,
      });

      children.push(subtree);
    }

    tree.children = children;

    return tree;
  } catch (err) {
    const subtreeName = name ?? treeInitial?.name ?? rootName;
    err.message = `makeSubtree(${subtreeName}, depth=${depth}): ${err.message}`;
    throw err;
  }
};

export const simplifyTree = (node) => {
  if (!node.children || node.children.length === 0) {
    const parts = (node.children ?? []).map((child) => child.name);
    return {
      id: node.id,
      name: `${node.name}${node.options?.[0] ? `: ${node.options?.[0]}` : ''}`,
      parts: parts.length ? parts : undefined,
    };
  }

  const parts = node.children.map((child) => simplifyTree(child));
  return {
    id: node.id,
    name: `${node.name}${node.options?.[0] ? `: ${node.options?.[0]}` : ''}`,
    parts: parts.length ? parts : undefined,
  };
};

class ChainTree {
  static async create(name, options = {}) {
    const { text: entityName, context: ownContext } = resolveTexts(name, []);
    const bundleContext = [options.bundleContext, ownContext].filter(Boolean).join('\n\n');
    const runConfig = nameStep(entityName, options);
    const emitter = createProgressEmitter(entityName, runConfig.onProgress, runConfig);
    emitter.start();

    try {
      const { temperature, variety } = await getOptions(runConfig, {
        temperature: undefined,
        variety: withPolicy(mapVariety),
      });

      const tree = new ChainTree(entityName, options, runConfig, {
        temperature,
        variety,
        bundleContext,
      });

      emitter.complete({ outcome: Outcome.success });

      return tree;
    } catch (err) {
      emitter.error(err);
      throw err;
    }
  }

  constructor(name, options = {}, config = {}, resolved = {}) {
    const { decompose, enhance, llm, makeId, enhanceFixes, decomposeFixes } = options;
    this.rootName = name;
    this.tree = {};
    this.decompose = decompose;
    this.enhance = enhance;
    this.llm = llm;
    this.makeId = makeId;
    this.enhanceFixes = enhanceFixes;
    this.decomposeFixes = decomposeFixes;
    this.config = config;
    this.bundleContext = resolved.bundleContext ?? '';
    this.temperature = resolved.temperature ?? options.temperature;
    this.variety =
      resolved.variety ?? (options.variety !== undefined ? mapVariety(options.variety) : undefined);
  }

  getTree() {
    return this.tree;
  }

  async attachSubtree({ find, depth }) {
    const clonedTree = deepClone(this.tree);

    // Find the node to attach the subtree to in the cloned tree
    const targetNodes = search(clonedTree, { match: find });

    if (!targetNodes || targetNodes.length !== 1) {
      return undefined;
    }

    const targetNode = targetNodes[0];

    const newNode = await makeSubtree({
      ...this,
      rootName: clonedTree.name,
      tree: targetNode,
      depth,
    });

    Object.assign(targetNode, newNode);

    const nodeStripped = {
      ...newNode,
      children: newNode.children.map((child) => ({
        ...child,
        children: [],
      })),
    };

    this.tree = clonedTree;

    return nodeStripped;
  }

  async makeSubtree(config = {}) {
    this.tree = await makeSubtree({
      ...this,
      rootName: this.tree.name || this.rootName,
      ...config,
    });

    return this.tree;
  }
}

export const dismantle = async (text, options = {}) => {
  const { text: entityName, context: bundleContext } = resolveTexts(text, []);
  if (typeof entityName !== 'string' || entityName.length === 0) {
    throw new Error(
      `dismantle: text must be a non-empty string (got ${
        entityName === null ? 'null' : typeof entityName
      })`
    );
  }
  const runConfig = nameStep(_name, options);
  const emitter = createProgressEmitter(_name, runConfig.onProgress, runConfig);
  emitter.start();
  emitter.emit({ event: DomainEvent.input, value: entityName });

  try {
    const batchDone = emitter.batch(1);

    emitter.emit({ event: DomainEvent.phase, phase: 'tree-construction' });
    const tree = await ChainTree.create(entityName, {
      ...runConfig,
      bundleContext,
      onProgress: scopePhase(runConfig.onProgress, 'tree-construction'),
    });
    batchDone(1);

    emitter.emit({ event: DomainEvent.output, value: tree });
    emitter.complete({ outcome: Outcome.success });
    return tree;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
};

ChainTree.knownTexts = [];
dismantle.knownTexts = [];

export default ChainTree;
