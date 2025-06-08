import * as R from 'ramda';

const hasOwnToString = (obj) => {
  return obj.toString !== Object.prototype.toString;
};

const keyFor = (obj) => {
  return hasOwnToString(obj) ? obj.toString() : obj;
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
  return !state.visited.has(keyFor(nextNode));
};

export default async ({
  next = nextDefault,
  node: rootNode,
  rank = rankDefault,
  state: stateInitial = {},
  visit = visitDefault,
  goal = () => false,
  returnPath = false,
}) => {
  let nodesTodo = [rootNode];
  const parents = new Map();
  let state = stateInitial;
  if (!state.visited) {
    state.visited = new Set();
  }
  parents.set(keyFor(rootNode), null);
  let lastNode = rootNode;

  while (nodesTodo.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    const nodesRanked = await rank({ nodes: nodesTodo, state });
    const node = nodesRanked.shift();
    lastNode = node;

    const nodesTodoNext = nodesTodo.filter((el) => keyFor(el) !== keyFor(node));

    state.visited.add(keyFor(node));

    // eslint-disable-next-line no-await-in-loop
    state = await visit({ node, state });

    if (goal({ node, state })) {
      if (returnPath) {
        const path = [];
        for (let cur = node; cur !== null; ) {
          path.unshift(cur);
          cur = parents.get(keyFor(cur));
        }
        return { state, path };
      }
      return state;
    }

    // eslint-disable-next-line no-await-in-loop
    const nextNodes = await next({ node, state });

    nextNodes.filter(filterWith(state)).forEach((nextNode) => {
      const key = keyFor(nextNode);
      if (!parents.has(key)) {
        parents.set(key, node);
      }
    });

    nodesTodo = R.unionWith(
      (nodeA, nodeB) => keyFor(nodeA) === keyFor(nodeB),
      nodesTodoNext,
      nextNodes.filter(filterWith(state))
    );
  }

  if (returnPath) {
    const path = [];
    for (let cur = lastNode; cur !== null; ) {
      path.unshift(cur);
      cur = parents.get(keyFor(cur));
    }
    return { state, path: path.length ? path : null };
  }

  return state;
};
