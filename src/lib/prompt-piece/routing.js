// ── Prompt Routing ──────────────────────────────────────────────────
// Pure algorithmic building blocks for routing between prompt pieces.
// The app builds its own routing data structures on top of these.
//
// Connection functions — how pieces relate:
//   connectParts      — find connections via tag matching
//   connectUpstream   — trace upstream through connections
//   connectDownstream — trace downstream through connections
//
// Planning functions — what to do with connections:
//   runOrder     — execution sequence from dependencies
//   detectCycles — check for circular dependencies

// ── Connection: tag matching ────────────────────────────────────────
// Derives connections from tag matching between sources and inputs.
//
// instances: Array<{ name: string, sourceTags: string[], inputs: Input[], pinned?: Set<string> }>
//
// Returns Array<{ from: string, to: string, inputId: string }>

const sourceQualifies = (sourceTags, inputTags) =>
  inputTags.length > 0 && inputTags.every((t) => sourceTags.includes(t));

export const connectParts = (instances) => {
  const edges = [];

  for (const to of instances) {
    const pinned = to.pinned ?? new Set();
    for (const input of to.inputs) {
      if (pinned.has(input.id)) continue;
      if (input.tags.length === 0) continue;

      for (const from of instances) {
        if (from.name === to.name) continue;
        if (sourceQualifies(from.sourceTags, input.tags)) {
          edges.push({ from: from.name, to: to.name, inputId: input.id });
        }
      }
    }
  }

  return edges;
};

// ── Connection: traversal ───────────────────────────────────────────
// BFS along edges in either direction.

const traverse = (edges, seeds, matchField, followField) => {
  const found = new Set();
  const queue = [...(Array.isArray(seeds) ? seeds : [seeds])];

  while (queue.length) {
    const current = queue.shift();
    for (const edge of edges) {
      if (edge[matchField] === current && !found.has(edge[followField])) {
        found.add(edge[followField]);
        queue.push(edge[followField]);
      }
    }
  }

  return [...found];
};

// Returns all names transitively downstream of the given name(s).
export const connectDownstream = (edges, names) => traverse(edges, names, 'from', 'to');

// Returns all names transitively upstream of the given name(s).
export const connectUpstream = (edges, names) => traverse(edges, names, 'to', 'from');

// ── Planning: execution order ───────────────────────────────────────
// Returns names in dependency order (Kahn's algorithm).
// Nodes involved in cycles are excluded from the result.

export const runOrder = (names, edges) => {
  const inDegree = Object.fromEntries(names.map((n) => [n, 0]));
  const adjacency = Object.fromEntries(names.map((n) => [n, new Set()]));

  for (const edge of edges) {
    if (edge.to in inDegree && edge.from in adjacency) {
      adjacency[edge.from].add(edge.to);
    }
  }

  for (const name of names) inDegree[name] = 0;
  for (const name of names) {
    for (const next of adjacency[name]) {
      inDegree[next]++;
    }
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

// ── Planning: cycle detection ───────────────────────────────────────
// Checks for cycles. Returns { valid, errors }.

export const detectCycles = (names, edges) => {
  const errors = [];
  const order = runOrder(names, edges);
  const inOrder = new Set(order);

  for (const name of names) {
    if (!inOrder.has(name)) {
      errors.push(`"${name}" is part of a cycle`);
    }
  }

  return { valid: errors.length === 0, errors };
};
