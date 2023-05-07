import * as R from 'ramda';

const hasOwnToString = (obj) => {
  return obj.toString !== Object.prototype.toString;
};

const visitDefault = () => {
  return Promise.reject(new Error('Not Implemented'));
};

const nextDefault = () => {
  return Promise.reject(new Error('Not Implemented'));
};

const rankDefault = () => {
  return Promise.reject(new Error('Not Implemented'));
};

const filterWith = (state) => (nextNode) => {
  return !state.visited.has(
    hasOwnToString(nextNode) ? nextNode.toString() : nextNode
  );
};

export default async ({
  next = nextDefault,
  node: rootNode,
  rank = rankDefault,
  state: stateInitial = { visited: new Set() },
  visit = visitDefault,
}) => {
  let nodesTodo = [rootNode];
  let state = stateInitial;

  while (nodesTodo.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    const nodesRanked = await rank({ nodes: nodesTodo, state });
    const node = nodesRanked.shift();

    const nodesTodoNext = nodesTodo.filter((el) =>
      hasOwnToString(node) ? el.toString() !== node.toString() : el !== node
    );

    state.visited.add(hasOwnToString(node) ? node.toString() : node);

    // eslint-disable-next-line no-await-in-loop
    state = await visit({ node, state });

    // eslint-disable-next-line no-await-in-loop
    const nextNodes = await next({ node, state });

    nodesTodo = R.unionWith(
      (nodeA, nodeB) =>
        hasOwnToString(nodeA)
          ? nodeA.toString() === nodeB.toString()
          : nodeA === nodeB,
      nodesTodoNext,
      nextNodes.filter(filterWith(state))
    );
  }

  return state;
};
