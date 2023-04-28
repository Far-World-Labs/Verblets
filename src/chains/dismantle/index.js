/* eslint-disable no-await-in-loop */

import { v4 as uuid } from 'uuid';

import budgetTokens from '../../lib/budget-tokens/index.js';
import chatGPT from '../../lib/chatgpt/index.js';
import {
  constants as promptConstants,
  outputSuccinctNames,
} from '../../prompts/index.js';
import toObject from '../../verblets/to-object/index.js';

const { onlyJSONStringArray } = promptConstants;

const subComponentsPrompt = (component, thing, fixes = '') => {
  let focus = '';
  if (component !== thing) {
    focus = `"${component}" within "${thing}"`;
  } else {
    focus = thing;
  }

  return `
${onlyJSONStringArray}

Exhaustively enumerate all physical and logical subcomponents of ${focus}, including containers or abstract components.

Apply the specifics listed here when dealing with component or entity:
 - ${outputSuccinctNames()}
 - If some components are subcomponents of others in the list, don't include them.
 - The output must not include "${thing}" or "${component}" in the list.
 - Only subcomponents, no accessories.
${fixes}

${onlyJSONStringArray}
`;
};

const componentOptionsPrompt = (component, thing, fixes = '') => {
  let focus = '';
  if (component !== thing) {
    focus = `Considering "${component}" as a separate component within "${thing}" entity`;
  } else {
    focus = `Considering "${component}"`;
  }
  return `
${onlyJSONStringArray}

${focus}, list specific variants for this component. Only provide known variants, don't speculate. Output an empty list if you must.

Apply the specifics listed here when dealing with component or entity:
 - ${outputSuccinctNames()}
 - Do not list subcomponents, that's not what this is about.
${fixes}

${onlyJSONStringArray}
`;
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

const defaultDecompose = async ({ name, focus, rootName, fixes } = {}) => {
  const focusFormatted = focus ? `: ${focus}` : '';

  const promptCreated = subComponentsPrompt(
    `${name}${focusFormatted}`,
    rootName,
    fixes
  );
  const budget = budgetTokens(promptCreated);
  return toObject(
    await chatGPT(promptCreated, {
      maxTokens: budget.completion,
      frequencyPenalty: 0.7,
      temperature: 0.7,
    })
  );
};

const defaultEnhance = async ({ name, rootName, fixes } = {}) => {
  const promptCreated = componentOptionsPrompt(name, rootName, fixes);
  const budget = budgetTokens(promptCreated);
  const options = toObject(
    await chatGPT(promptCreated, {
      maxTokens: budget.completion,
      frequencyPenalty: 0.5,
      temperature: 0.3,
    })
  );

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
  makeId = uuid,
  enhanceFixes,
  decomposeFixes,
} = {}) => {
  const name = nameInitial ?? rootName;

  let nodeNew = node;

  if (!node.isEnhanced) {
    nodeNew = await enhance({
      name,
      rootName,
      fixes: enhanceFixes,
    });
    nodeNew.isEnhanced = true;

    const focus = node.options?.[0];

    const childNames = await decompose({
      name,
      focus,
      rootName,
      fixes: decomposeFixes,
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
  enhanceFixes,
  decomposeFixes,
  makeId,
} = {}) => {
  let tree = { ...(treeInitial ?? {}) };

  const nodeNew = await makeNode({
    node: tree,
    name: name ?? tree.name,
    rootName,
    enhance,
    decompose,
    makeId,
    enhanceFixes,
    decomposeFixes,
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
    const subtree = await makeSubtree({
      tree: child,
      rootName,
      decompose,
      enhance,
      depth: depth - 1,
      makeId,
      enhanceFixes,
      decomposeFixes,
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
  constructor(
    name,
    { decompose, enhance, makeId, enhanceFixes, decomposeFixes } = {}
  ) {
    this.rootName = name;
    this.tree = {};
    this.decompose = decompose;
    this.enhance = enhance;
    this.makeId = makeId;
    this.enhanceFixes = enhanceFixes;
    this.decomposeFixes = decomposeFixes;
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

export default ChainTree;
