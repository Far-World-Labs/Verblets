// ── Prompt Graph ────────────────────────────────────────────────────
// A directed graph of named prompt bundles connected by edges.
// An edge { from, to, slot } means: the output of node `from`
// feeds slot `slot` of node `to`.
//
// All structural functions are pure and return new graphs — no mutation.
// execute() is the only async function — it runs the graph.
//
// Graph shape:
// { nodes: Record<string, Bundle>, edges: Edge[] }
// Edge shape:
// { from: string, to: string, slot: string }

import {
  pendingSlots as bundlePending,
  bind as bundleBind,
  buildPrompt as bundleBuild,
} from '../prompt-bundle/index.js';
import { emitStepProgress, emitComplete } from '../../lib/progress-callback/index.js';
import { debug } from '../../lib/debug/index.js';

// ── Internal helpers ─────────────────────────────────────────────────

const edgeKey = (e) => `${e.from}\0${e.to}\0${e.slot}`;

// ── Creation ────────────────────────────────────────────────────────

export const createGraph = () => ({ nodes: {}, edges: [] });

// ── Node operations ─────────────────────────────────────────────────

export const addNode = (graph, name, bundle) => ({
  ...graph,
  nodes: { ...graph.nodes, [name]: bundle },
});

export const removeNode = (graph, name) => {
  const nodes = Object.fromEntries(Object.entries(graph.nodes).filter(([k]) => k !== name));
  return {
    nodes,
    edges: graph.edges.filter((e) => e.from !== name && e.to !== name),
  };
};

export const getNode = (graph, name) => graph.nodes[name];

export const nodeNames = (graph) => Object.keys(graph.nodes);

// ── Edge operations ─────────────────────────────────────────────────

export const connect = (graph, { from, to, slot }) => ({
  ...graph,
  edges: [...graph.edges, { from, to, slot }],
});

export const disconnect = (graph, { from, to, slot }) => ({
  ...graph,
  edges: graph.edges.filter((e) => !(e.from === from && e.to === to && e.slot === slot)),
});

// ── Traversal ───────────────────────────────────────────────────────

export const upstream = (graph, name) => graph.edges.filter((e) => e.to === name);

export const downstream = (graph, name) => graph.edges.filter((e) => e.from === name);

export const sources = (graph) =>
  Object.keys(graph.nodes).filter((n) => !graph.edges.some((e) => e.to === n));

export const sinks = (graph) =>
  Object.keys(graph.nodes).filter((n) => !graph.edges.some((e) => e.from === n));

// ── Topological sort (Kahn's algorithm) ─────────────────────────────
// Returns node names in dependency order — build sources first.
// Nodes involved in cycles are excluded from the result.

export const buildOrder = (graph) => {
  const names = Object.keys(graph.nodes);
  const inDegree = Object.fromEntries(names.map((n) => [n, 0]));
  const adjacency = Object.fromEntries(names.map((n) => [n, []]));

  for (const edge of graph.edges) {
    if (edge.to in inDegree && edge.from in adjacency) {
      inDegree[edge.to]++;
      adjacency[edge.from].push(edge.to);
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

// ── Impact analysis ─────────────────────────────────────────────────
// Returns all node names transitively downstream of the given node(s).
// Accepts a single name or an array of names as starting points.
// If node A feeds B and B feeds C, impact(graph, 'A') → ['B', 'C'].

export const impact = (graph, names) => {
  const seeds = Array.isArray(names) ? names : [names];
  const affected = new Set();
  const queue = [...seeds];

  while (queue.length) {
    const current = queue.shift();
    for (const edge of graph.edges) {
      if (edge.from === current && !affected.has(edge.to)) {
        affected.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  return [...affected];
};

// ── Dependency analysis ──────────────────────────────────────────────
// Returns all node names transitively upstream of the given node(s).
// Mirror of impact: if A feeds B and B feeds C, dependencies(graph, 'C') → ['A', 'B'].

export const dependencies = (graph, names) => {
  const seeds = Array.isArray(names) ? names : [names];
  const found = new Set();
  const queue = [...seeds];

  while (queue.length) {
    const current = queue.shift();
    for (const edge of graph.edges) {
      if (edge.to === current && !found.has(edge.from)) {
        found.add(edge.from);
        queue.push(edge.from);
      }
    }
  }

  return [...found];
};

// ── Validation ──────────────────────────────────────────────────────
// Returns { valid, errors[] } describing any structural problems.

export const validate = (graph) => {
  const names = new Set(Object.keys(graph.nodes));
  const errors = [];

  for (const edge of graph.edges) {
    if (!names.has(edge.from)) {
      errors.push(`Edge references missing source node "${edge.from}"`);
    }
    if (!names.has(edge.to)) {
      errors.push(`Edge references missing target node "${edge.to}"`);
    }
    if (edge.from === edge.to) {
      errors.push(`Self-loop on node "${edge.from}" via slot "${edge.slot}"`);
    }
  }

  // Check for cycles
  const order = buildOrder(graph);
  const inOrder = new Set(order);
  for (const name of names) {
    if (!inOrder.has(name)) {
      errors.push(`Node "${name}" is part of a cycle`);
    }
  }

  return { valid: errors.length === 0, errors };
};

// ── Inspection ──────────────────────────────────────────────────────
// Graph-level diagnostics with per-node detail.

export const inspectGraph = (graph) => {
  const nodes = Object.entries(graph.nodes).map(([name, bundle]) => {
    const slots = bundlePending(bundle);
    return {
      name,
      pending: slots,
      ready: slots.length === 0,
      described: bundle.description !== undefined,
    };
  });

  return {
    nodeCount: nodes.length,
    edgeCount: graph.edges.length,
    ready: nodes.every((n) => n.ready),
    described: nodes.every((n) => n.described),
    nodes,
  };
};

// ── Structural composition ──────────────────────────────────────────

// Merge two graphs — union nodes (b wins on conflict) and
// deduplicate edges. Idempotent: mergeGraphs(g, g) ≈ g.
// Completes the merge concept: insertSections (markers),
// addExtensions (bundle), mergeGraphs (graph).

export const mergeGraphs = (a, b) => {
  const seen = new Set();
  const edges = [];
  for (const e of [...a.edges, ...b.edges]) {
    const key = edgeKey(e);
    if (!seen.has(key)) {
      seen.add(key);
      edges.push(e);
    }
  }
  return { nodes: { ...a.nodes, ...b.nodes }, edges };
};

// Extract a subset of the graph — only named nodes and their
// interconnecting edges. Edges with endpoints outside the subset
// are excluded.

export const subgraph = (graph, names) => {
  const nameSet = new Set(names);
  return {
    nodes: Object.fromEntries(Object.entries(graph.nodes).filter(([n]) => nameSet.has(n))),
    edges: graph.edges.filter((e) => nameSet.has(e.from) && nameSet.has(e.to)),
  };
};

// ── Higher-order node operations ─────────────────────────────────────

export const mapNodes = (graph, fn) => ({
  ...graph,
  nodes: Object.fromEntries(
    Object.entries(graph.nodes).map(([name, bundle]) => [name, fn(bundle, name)])
  ),
});

export const mapNodesAsync = async (graph, fn) => ({
  ...graph,
  nodes: Object.fromEntries(
    await Promise.all(
      Object.entries(graph.nodes).map(async ([name, bundle]) => [name, await fn(bundle, name)])
    )
  ),
});

export const filterNodes = (graph, predicate) => {
  const kept = Object.entries(graph.nodes).filter(([name, bundle]) => predicate(bundle, name));
  const keptNames = new Set(kept.map(([name]) => name));
  return {
    nodes: Object.fromEntries(kept),
    edges: graph.edges.filter((e) => keptNames.has(e.from) && keptNames.has(e.to)),
  };
};

// ── Comparison ──────────────────────────────────────────────────────

export const diffGraphs = (before, after) => {
  const beforeNames = new Set(Object.keys(before.nodes));
  const afterNames = new Set(Object.keys(after.nodes));

  const beforeEdges = new Set(before.edges.map(edgeKey));
  const afterEdges = new Set(after.edges.map(edgeKey));

  return {
    nodesAdded: [...afterNames].filter((n) => !beforeNames.has(n)),
    nodesRemoved: [...beforeNames].filter((n) => !afterNames.has(n)),
    edgesAdded: after.edges.filter((e) => !beforeEdges.has(edgeKey(e))),
    edgesRemoved: before.edges.filter((e) => !afterEdges.has(edgeKey(e))),
  };
};

// ── Execution ───────────────────────────────────────────────────────
// Runs graph nodes in order. For each node, upstream outputs are
// wired into the node's bundle as slot bindings, the prompt is built,
// and the runner is called.
//
// runner(name, prompt, bundle) → result (any)
//
// Returns Record<string, result> keyed by node name.

const stringify = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

const abortError = (signal) => signal?.reason ?? new Error('The operation was aborted.');

const executeNodes = async (graph, runner, order, initialResults, config) => {
  const { onProgress, abortSignal, now = new Date() } = config;
  const results = { ...initialResults };

  emitStepProgress(onProgress, 'prompt-graph', 'executing', {
    nodeCount: order.length,
    order,
    now: new Date(),
    chainStartTime: now,
  });

  for (const name of order) {
    if (abortSignal?.aborted) throw abortError(abortSignal);

    const node = graph.nodes[name];

    // Wire upstream results into this node's bindings
    const upstreamEdges = upstream(graph, name);
    const wiredBindings = {};
    for (const edge of upstreamEdges) {
      if (edge.from in results) {
        wiredBindings[edge.slot] = stringify(results[edge.from]);
      }
    }

    const wiredBundle =
      Object.keys(wiredBindings).length > 0 ? bundleBind(node, wiredBindings) : node;
    const prompt = bundleBuild(wiredBundle);

    emitStepProgress(onProgress, 'prompt-graph', 'running-node', {
      name,
      wiredSlots: Object.keys(wiredBindings),
      promptLength: prompt.length,
      now: new Date(),
      chainStartTime: now,
    });

    // eslint-disable-next-line no-await-in-loop
    results[name] = await runner(name, prompt, wiredBundle);

    debug(
      `prompt-graph: executed "${name}" (${prompt.length} chars, ${Object.keys(wiredBindings).length} wired slots)`
    );
  }

  emitComplete(onProgress, 'prompt-graph', {
    nodeCount: order.length,
    executedNodes: Object.keys(results),
    now: new Date(),
    chainStartTime: now,
  });

  return results;
};

export const execute = async (graph, runner, config = {}) =>
  await executeNodes(graph, runner, buildOrder(graph), {}, config);

// ── Incremental Re-execution ────────────────────────────────────────
// Re-runs only the changed nodes and their transitive downstream.
// Previous results are reused for unaffected upstream nodes.

export const reexecute = async (graph, runner, changed, config = {}) => {
  const { previous = {}, ...rest } = config;
  const affected = new Set([...changed, ...impact(graph, changed)]);
  const order = buildOrder(graph).filter((n) => affected.has(n));

  debug(
    `prompt-graph: reexecute — ${changed.length} changed, ${order.length} affected (of ${Object.keys(graph.nodes).length} total)`
  );

  return await executeNodes(graph, runner, order, previous, rest);
};
