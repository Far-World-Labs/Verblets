import { v4 as uuid } from 'uuid';

import callLlm from '../../lib/llm/index.js';
import retry from '../../lib/retry/index.js';
import { outputSuccinctNames } from '../../prompts/index.js';
import { subComponentsSchema, componentOptionsSchema } from './schemas.js';
import { getOptions, withPolicy, scopeOperation } from '../../lib/context/option.js';

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

const defaultDecompose = async ({
  name,
  focus,
  rootName,
  fixes,
  llm,
  maxAttempts = 3,
  retryOnAll = false,
  temperature,
  variety,
  onProgress,
  abortSignal,
} = {}) => {
  const focusFormatted = focus ? `: ${focus}` : '';

  const promptCreated = subComponentsPrompt(`${name}${focusFormatted}`, rootName, fixes);
  const result = await retry(
    () =>
      callLlm(promptCreated, {
        llm,
        frequencyPenalty: variety ?? DEFAULT_DECOMPOSE_PENALTY,
        temperature: temperature ?? 0.7,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'subcomponents',
            schema: subComponentsSchema,
          },
        },
      }),
    {
      label: 'dismantle-decompose',
      maxAttempts,
      retryOnAll,
      onProgress,
      abortSignal,
    }
  );
  return result;
};

const defaultEnhance = async ({
  name,
  rootName,
  fixes,
  llm,
  maxAttempts = 3,
  retryOnAll = false,
  temperature,
  variety,
  onProgress,
  abortSignal,
} = {}) => {
  const promptCreated = componentOptionsPrompt(name, rootName, fixes);
  const enhanceVariety = variety ? variety * 0.7 : DEFAULT_ENHANCE_PENALTY;
  const result = await retry(
    () =>
      callLlm(promptCreated, {
        llm,
        frequencyPenalty: enhanceVariety,
        temperature: temperature ?? 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'component_options',
            schema: componentOptionsSchema,
          },
        },
      }),
    {
      label: 'dismantle-enhance',
      maxAttempts,
      retryOnAll,
      onProgress,
      abortSignal,
    }
  );
  const options = result;

  return {
    name,
    options,
    topOptionName: options?.[0],
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
  maxAttempts = 3,
  variety,
  onProgress,
  abortSignal,
  now = new Date(),
} = {}) => {
  const name = nameInitial ?? rootName;

  let nodeNew = node;

  if (!node.isEnhanced) {
    nodeNew = await enhance({
      name,
      rootName,
      fixes: enhanceFixes,
      llm,
      maxAttempts,
      variety,
      onProgress,
      abortSignal,
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
      maxAttempts,
      variety,
      onProgress,
      abortSignal,
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
  maxAttempts = 3,
  variety: _variety,
  onProgress,
  abortSignal,
  now = new Date(),
} = {}) => {
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
    maxAttempts,
    onProgress,
    abortSignal,
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
      maxAttempts,
      onProgress,
      abortSignal,
      now,
    });

    children.push(subtree);
  }

  tree.children = children;

  return tree;
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
    const config = scopeOperation('dismantle', options);
    const { maxAttempts, retryOnAll, temperature, variety } = await getOptions(config, {
      maxAttempts: 3,
      retryOnAll: false,
      temperature: undefined,
      variety: withPolicy(mapVariety),
    });
    return new ChainTree(name, options, { maxAttempts, retryOnAll, temperature, variety });
  }

  constructor(name, options = {}, resolved = {}) {
    const { decompose, enhance, llm, makeId, enhanceFixes, decomposeFixes, abortSignal } = options;
    this.rootName = name;
    this.tree = {};
    this.decompose = decompose;
    this.enhance = enhance;
    this.llm = llm;
    this.makeId = makeId;
    this.enhanceFixes = enhanceFixes;
    this.decomposeFixes = decomposeFixes;
    this.abortSignal = abortSignal;
    this.maxAttempts = resolved.maxAttempts ?? options.maxAttempts ?? 3;
    this.retryOnAll = resolved.retryOnAll ?? options.retryOnAll ?? false;
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

export const dismantle = async (text, options) => {
  return await ChainTree.create(text, options);
};

export default ChainTree;
