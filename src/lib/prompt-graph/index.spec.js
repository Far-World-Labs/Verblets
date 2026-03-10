import { describe, it, expect, vi } from 'vitest';
import {
  createGraph,
  addNode,
  removeNode,
  getNode,
  nodeNames,
  connect,
  disconnect,
  upstream,
  downstream,
  sources,
  sinks,
  buildOrder,
  impact,
  dependencies,
  validate,
  inspectGraph,
  mergeGraphs,
  subgraph,
  mapNodes,
  mapNodesAsync,
  filterNodes,
  diffGraphs,
  execute,
  reexecute,
} from './index.js';
import {
  createBundle,
  addExtensions,
  bind,
  setDescription,
  withBindings,
  pendingSlots,
} from '../prompt-bundle/index.js';

const ext = (overrides = {}) => ({
  id: 'ctx-terms',
  type: 'context',
  placement: 'prepend',
  preamble: 'Terms:\n{{medical_terms}}',
  slot: 'medical_terms',
  need: 'Medical glossary',
  effort: 'medium',
  rationale: 'Domain terms reduce ambiguity.',
  produces: 'Output uses correct terminology.',
  ...overrides,
});

const makeBundle = (base, exts = [], bindings = {}) =>
  bind(addExtensions(createBundle(base), exts), bindings);

describe('prompt-graph', () => {
  describe('createGraph', () => {
    it('should create an empty graph', () => {
      const graph = createGraph();
      expect(graph.nodes).toEqual({});
      expect(graph.edges).toEqual([]);
    });
  });

  describe('addNode / removeNode / getNode', () => {
    it('should add a bundle as a named node', () => {
      const bundle = createBundle('Extract entities.');
      const graph = addNode(createGraph(), 'extractor', bundle);

      expect(getNode(graph, 'extractor')).toBe(bundle);
    });

    it('should remove a node and its edges', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'input' });
      graph = removeNode(graph, 'a');

      expect(getNode(graph, 'a')).toBeUndefined();
      expect(graph.edges).toHaveLength(0);
      expect(getNode(graph, 'b')).toBeDefined();
    });

    it('should not mutate the original graph', () => {
      const g1 = createGraph();
      const g2 = addNode(g1, 'x', createBundle('X'));
      expect(Object.keys(g1.nodes)).toHaveLength(0);
      expect(Object.keys(g2.nodes)).toHaveLength(1);
    });

    it('should replace an existing node while preserving edges', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Old A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'data' });

      const newBundle = createBundle('New A');
      graph = addNode(graph, 'a', newBundle);

      expect(getNode(graph, 'a')).toBe(newBundle);
      expect(getNode(graph, 'a').base).toBe('New A');
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toEqual({ from: 'a', to: 'b', slot: 'data' });
    });

    it('should not mutate when replacing', () => {
      const g1 = addNode(createGraph(), 'x', createBundle('Old'));
      const g2 = addNode(g1, 'x', createBundle('New'));

      expect(getNode(g1, 'x').base).toBe('Old');
      expect(getNode(g2, 'x').base).toBe('New');
    });
  });

  describe('nodeNames', () => {
    it('should return all node names', () => {
      let graph = createGraph();
      graph = addNode(graph, 'alpha', createBundle('A'));
      graph = addNode(graph, 'beta', createBundle('B'));
      graph = addNode(graph, 'gamma', createBundle('C'));

      expect(nodeNames(graph).sort()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should return empty array for empty graph', () => {
      expect(nodeNames(createGraph())).toEqual([]);
    });
  });

  describe('connect / disconnect', () => {
    it('should add an edge between nodes', () => {
      let graph = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'entities' });

      expect(graph.edges).toEqual([{ from: 'a', to: 'b', slot: 'entities' }]);
    });

    it('should remove a specific edge', () => {
      let graph = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'entities' });
      graph = connect(graph, { from: 'a', to: 'b', slot: 'context' });
      graph = disconnect(graph, { from: 'a', to: 'b', slot: 'entities' });

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].slot).toBe('context');
    });

    it('should allow multiple edges between the same nodes for different slots', () => {
      let graph = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'slot1' });
      graph = connect(graph, { from: 'a', to: 'b', slot: 'slot2' });

      expect(graph.edges).toHaveLength(2);
    });

    it('should accept edge objects returned by upstream/downstream', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const edges = downstream(graph, 'a');
      graph = disconnect(graph, edges[0]);

      expect(graph.edges).toEqual([]);
    });
  });

  describe('upstream / downstream', () => {
    it('should return edges feeding into a node', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'c', slot: 'entities' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'context' });

      const up = upstream(graph, 'c');
      expect(up).toHaveLength(2);
      expect(up.map((e) => e.from).sort()).toEqual(['a', 'b']);
    });

    it('should return edges going out of a node', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'a', to: 'c', slot: 'y' });

      const down = downstream(graph, 'a');
      expect(down).toHaveLength(2);
      expect(down.map((e) => e.to).sort()).toEqual(['b', 'c']);
    });

    it('should return empty for nodes with no connections', () => {
      const graph = addNode(createGraph(), 'a', createBundle('A'));
      expect(upstream(graph, 'a')).toEqual([]);
      expect(downstream(graph, 'a')).toEqual([]);
    });
  });

  describe('sources / sinks', () => {
    it('should return nodes with no incoming edges as sources', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'c', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });

      expect(sources(graph).sort()).toEqual(['a', 'b']);
    });

    it('should return nodes with no outgoing edges as sinks', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'a', to: 'c', slot: 'y' });

      expect(sinks(graph).sort()).toEqual(['b', 'c']);
    });

    it('should return all nodes when there are no edges', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));

      expect(sources(graph).sort()).toEqual(['a', 'b']);
      expect(sinks(graph).sort()).toEqual(['a', 'b']);
    });

    it('should return empty for empty graph', () => {
      const graph = createGraph();
      expect(sources(graph)).toEqual([]);
      expect(sinks(graph)).toEqual([]);
    });

    it('should handle linear chain — one source, one sink', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });

      expect(sources(graph)).toEqual(['a']);
      expect(sinks(graph)).toEqual(['c']);
    });
  });

  describe('buildOrder', () => {
    it('should return nodes in dependency order', () => {
      let graph = createGraph();
      graph = addNode(graph, 'source', createBundle('Source'));
      graph = addNode(graph, 'middle', createBundle('Middle'));
      graph = addNode(graph, 'sink', createBundle('Sink'));
      graph = connect(graph, { from: 'source', to: 'middle', slot: 'x' });
      graph = connect(graph, { from: 'middle', to: 'sink', slot: 'y' });

      const order = buildOrder(graph);

      expect(order.indexOf('source')).toBeLessThan(order.indexOf('middle'));
      expect(order.indexOf('middle')).toBeLessThan(order.indexOf('sink'));
    });

    it('should handle independent nodes in any order', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));

      const order = buildOrder(graph);
      expect(order).toHaveLength(2);
      expect(order).toContain('a');
      expect(order).toContain('b');
    });

    it('should handle diamond dependencies', () => {
      let graph = createGraph();
      graph = addNode(graph, 'root', createBundle('Root'));
      graph = addNode(graph, 'left', createBundle('Left'));
      graph = addNode(graph, 'right', createBundle('Right'));
      graph = addNode(graph, 'join', createBundle('Join'));
      graph = connect(graph, { from: 'root', to: 'left', slot: 'a' });
      graph = connect(graph, { from: 'root', to: 'right', slot: 'b' });
      graph = connect(graph, { from: 'left', to: 'join', slot: 'c' });
      graph = connect(graph, { from: 'right', to: 'join', slot: 'd' });

      const order = buildOrder(graph);

      expect(order.indexOf('root')).toBeLessThan(order.indexOf('left'));
      expect(order.indexOf('root')).toBeLessThan(order.indexOf('right'));
      expect(order.indexOf('left')).toBeLessThan(order.indexOf('join'));
      expect(order.indexOf('right')).toBeLessThan(order.indexOf('join'));
    });

    it('should exclude nodes in cycles', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'safe', createBundle('Safe'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'a', slot: 'y' });

      const order = buildOrder(graph);

      expect(order).toEqual(['safe']);
    });
  });

  describe('impact', () => {
    it('should return all transitively downstream nodes', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'a', to: 'd', slot: 'z' });

      const affected = impact(graph, 'a');

      expect(affected.sort()).toEqual(['b', 'c', 'd']);
    });

    it('should not include the source node', () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));
      expect(impact(graph, 'a')).toEqual([]);
    });

    it('should return empty for leaf nodes', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      expect(impact(graph, 'b')).toEqual([]);
    });

    it('should handle convergent paths without duplicates', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'a', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'z' });

      const affected = impact(graph, 'a');
      expect(affected.sort()).toEqual(['b', 'c']);
    });

    it('should accept an array of starting nodes', () => {
      // A → C, B → D, C → E, D → E
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = addNode(graph, 'e', createBundle('E'));
      graph = connect(graph, { from: 'a', to: 'c', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'd', slot: 'y' });
      graph = connect(graph, { from: 'c', to: 'e', slot: 'z' });
      graph = connect(graph, { from: 'd', to: 'e', slot: 'w' });

      // Impact of changing both A and B
      const affected = impact(graph, ['a', 'b']);

      expect(affected.sort()).toEqual(['c', 'd', 'e']);
    });

    it('should deduplicate when multiple seeds share downstream nodes', () => {
      // A → C, B → C
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'c', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });

      const affected = impact(graph, ['a', 'b']);

      expect(affected).toEqual(['c']);
    });
  });

  describe('dependencies', () => {
    it('should return all transitively upstream nodes', () => {
      // A → B → C, A → D
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'a', to: 'd', slot: 'z' });

      expect(dependencies(graph, 'c').sort()).toEqual(['a', 'b']);
    });

    it('should not include the target node itself', () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));
      expect(dependencies(graph, 'a')).toEqual([]);
    });

    it('should return empty for source nodes', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      expect(dependencies(graph, 'a')).toEqual([]);
    });

    it('should accept an array of target nodes', () => {
      // A → C, B → D
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'c', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'd', slot: 'y' });

      expect(dependencies(graph, ['c', 'd']).sort()).toEqual(['a', 'b']);
    });

    it('should deduplicate when multiple targets share upstream nodes', () => {
      // A → B, A → C
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'a', to: 'c', slot: 'y' });

      expect(dependencies(graph, ['b', 'c'])).toEqual(['a']);
    });

    it('should be the mirror of impact', () => {
      // A → B → C → D
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'c', to: 'd', slot: 'z' });

      // Everything downstream of A
      expect(impact(graph, 'a').sort()).toEqual(['b', 'c', 'd']);
      // Everything upstream of D
      expect(dependencies(graph, 'd').sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('validate', () => {
    it('should return valid for a well-formed graph', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'data' });

      const result = validate(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect edges referencing missing source nodes', () => {
      let graph = addNode(createGraph(), 'b', createBundle('B'));
      graph = { ...graph, edges: [{ from: 'missing', to: 'b', slot: 'x' }] };

      const result = validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('missing source'));
    });

    it('should detect edges referencing missing target nodes', () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));
      graph = { ...graph, edges: [{ from: 'a', to: 'missing', slot: 'x' }] };

      const result = validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('missing target'));
    });

    it('should detect self-loops', () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));
      graph = connect(graph, { from: 'a', to: 'a', slot: 'loop' });

      const result = validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Self-loop'));
    });

    it('should detect cycles', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'a', slot: 'y' });

      const result = validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('cycle'));
    });

    it('should return valid for empty graph', () => {
      expect(validate(createGraph()).valid).toBe(true);
    });
  });

  describe('inspectGraph', () => {
    it('should return graph-level summary and per-node detail', () => {
      const filled = makeBundle('Task A.', [ext()], { medical_terms: 'data' });
      const unfilled = makeBundle('Task B.', [ext({ id: 'ctx-b', slot: 'missing' })]);
      const described = setDescription(createBundle('Task C.'), {
        purpose: 'test',
        inputs: '',
        outputs: '',
        qualities: [],
        gaps: [],
      });

      let graph = createGraph();
      graph = addNode(graph, 'filled', filled);
      graph = addNode(graph, 'unfilled', unfilled);
      graph = addNode(graph, 'described', described);
      graph = connect(graph, { from: 'filled', to: 'unfilled', slot: 'data' });

      const result = inspectGraph(graph);

      // Graph-level summary
      expect(result.nodeCount).toBe(3);
      expect(result.edgeCount).toBe(1);
      expect(result.ready).toBe(false);
      expect(result.described).toBe(false);

      // Per-node detail
      const byName = Object.fromEntries(result.nodes.map((r) => [r.name, r]));

      expect(byName.filled.ready).toBe(true);
      expect(byName.filled.pending).toEqual([]);

      expect(byName.unfilled.ready).toBe(false);
      expect(byName.unfilled.pending).toEqual(['missing']);

      expect(byName.described.ready).toBe(true);
      expect(byName.described.described).toBe(true);
      expect(byName.filled.described).toBe(false);
    });

    it('should report ready when all nodes have no pending slots', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Plain A.'));
      graph = addNode(graph, 'b', makeBundle('B.', [ext()], { medical_terms: 'data' }));

      expect(inspectGraph(graph).ready).toBe(true);
    });

    it('should report described when all nodes have descriptions', () => {
      const desc = { purpose: 'test', inputs: '', outputs: '', qualities: [], gaps: [] };
      let graph = createGraph();
      graph = addNode(graph, 'a', setDescription(createBundle('A'), desc));
      graph = addNode(graph, 'b', setDescription(createBundle('B'), desc));

      expect(inspectGraph(graph).described).toBe(true);
    });

    it('should handle empty graph', () => {
      const result = inspectGraph(createGraph());

      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
      expect(result.ready).toBe(true);
      expect(result.described).toBe(true);
      expect(result.nodes).toEqual([]);
    });
  });

  describe('subgraph', () => {
    it('should extract named nodes and their interconnecting edges', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'c', to: 'd', slot: 'z' });

      const sub = subgraph(graph, ['b', 'c']);

      expect(Object.keys(sub.nodes).sort()).toEqual(['b', 'c']);
      expect(sub.edges).toHaveLength(1);
      expect(sub.edges[0]).toEqual({ from: 'b', to: 'c', slot: 'y' });
    });

    it('should exclude edges with endpoints outside the subset', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const sub = subgraph(graph, ['a']);

      expect(Object.keys(sub.nodes)).toEqual(['a']);
      expect(sub.edges).toEqual([]);
    });

    it('should return empty graph for empty name list', () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));
      const sub = subgraph(graph, []);

      expect(Object.keys(sub.nodes)).toEqual([]);
      expect(sub.edges).toEqual([]);
    });
  });

  describe('mergeGraphs', () => {
    it('should union nodes and edges from two graphs', () => {
      let g1 = addNode(createGraph(), 'a', createBundle('A'));
      g1 = addNode(g1, 'b', createBundle('B'));
      g1 = connect(g1, { from: 'a', to: 'b', slot: 'x' });

      let g2 = addNode(createGraph(), 'c', createBundle('C'));
      g2 = addNode(g2, 'd', createBundle('D'));
      g2 = connect(g2, { from: 'c', to: 'd', slot: 'y' });

      const merged = mergeGraphs(g1, g2);

      expect(Object.keys(merged.nodes).sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(merged.edges).toHaveLength(2);
    });

    it('should resolve node conflicts with second graph winning', () => {
      const g1 = addNode(createGraph(), 'shared', createBundle('Version 1'));
      const g2 = addNode(createGraph(), 'shared', createBundle('Version 2'));

      const merged = mergeGraphs(g1, g2);

      expect(getNode(merged, 'shared').base).toBe('Version 2');
    });

    it('should deduplicate identical edges', () => {
      let g1 = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      g1 = connect(g1, { from: 'a', to: 'b', slot: 'x' });

      let g2 = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      g2 = connect(g2, { from: 'a', to: 'b', slot: 'x' });

      const merged = mergeGraphs(g1, g2);

      expect(merged.edges).toHaveLength(1);
    });

    it('should be idempotent: merging a graph with itself', () => {
      let graph = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const merged = mergeGraphs(graph, graph);

      expect(Object.keys(merged.nodes)).toEqual(Object.keys(graph.nodes));
      expect(merged.edges).toHaveLength(1);
    });

    it('should preserve distinct edges between the same nodes for different slots', () => {
      let g1 = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      g1 = connect(g1, { from: 'a', to: 'b', slot: 'slot1' });

      let g2 = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      g2 = connect(g2, { from: 'a', to: 'b', slot: 'slot2' });

      const merged = mergeGraphs(g1, g2);

      expect(merged.edges).toHaveLength(2);
      expect(merged.edges.map((e) => e.slot).sort()).toEqual(['slot1', 'slot2']);
    });
  });

  describe('diffGraphs', () => {
    it('should detect added and removed nodes', () => {
      const before = addNode(
        addNode(createGraph(), 'a', createBundle('A')),
        'b',
        createBundle('B')
      );
      const after = addNode(addNode(createGraph(), 'b', createBundle('B')), 'c', createBundle('C'));

      const result = diffGraphs(before, after);

      expect(result.nodesAdded).toEqual(['c']);
      expect(result.nodesRemoved).toEqual(['a']);
    });

    it('should detect added and removed edges', () => {
      let before = addNode(
        addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B')),
        'c',
        createBundle('C')
      );
      before = connect(before, { from: 'a', to: 'b', slot: 'x' });

      let after = addNode(
        addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B')),
        'c',
        createBundle('C')
      );
      after = connect(after, { from: 'b', to: 'c', slot: 'y' });

      const result = diffGraphs(before, after);

      expect(result.nodesAdded).toEqual([]);
      expect(result.nodesRemoved).toEqual([]);
      expect(result.edgesAdded).toEqual([{ from: 'b', to: 'c', slot: 'y' }]);
      expect(result.edgesRemoved).toEqual([{ from: 'a', to: 'b', slot: 'x' }]);
    });

    it('should report no changes for identical graphs', () => {
      let graph = addNode(addNode(createGraph(), 'a', createBundle('A')), 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const result = diffGraphs(graph, graph);

      expect(result.nodesAdded).toEqual([]);
      expect(result.nodesRemoved).toEqual([]);
      expect(result.edgesAdded).toEqual([]);
      expect(result.edgesRemoved).toEqual([]);
    });

    it('should handle empty graphs', () => {
      const result = diffGraphs(createGraph(), createGraph());

      expect(result.nodesAdded).toEqual([]);
      expect(result.nodesRemoved).toEqual([]);
      expect(result.edgesAdded).toEqual([]);
      expect(result.edgesRemoved).toEqual([]);
    });
  });

  describe('mapNodes', () => {
    it('should transform every bundle in the graph', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const mapped = mapNodes(graph, (bundle) => setDescription(bundle, { purpose: 'mapped' }));

      expect(getNode(mapped, 'a').description).toEqual({ purpose: 'mapped' });
      expect(getNode(mapped, 'b').description).toEqual({ purpose: 'mapped' });
      expect(mapped.edges).toEqual(graph.edges);
    });

    it('should pass node name as second argument', () => {
      let graph = addNode(
        addNode(createGraph(), 'alpha', createBundle('A')),
        'beta',
        createBundle('B')
      );

      const mapped = mapNodes(graph, (bundle, name) =>
        setDescription(bundle, { purpose: `node-${name}` })
      );

      expect(getNode(mapped, 'alpha').description.purpose).toBe('node-alpha');
      expect(getNode(mapped, 'beta').description.purpose).toBe('node-beta');
    });

    it('should preserve edges', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'data' });

      const mapped = mapNodes(graph, (bundle) => bundle);

      expect(mapped.edges).toEqual([{ from: 'a', to: 'b', slot: 'data' }]);
    });

    it('should compose with bundle curried helpers for graph-wide transforms', () => {
      const termExt = ext({ id: 'ctx-terms', slot: 'terms', preamble: 'Terms:\n{{terms}}' });

      let graph = createGraph();
      graph = addNode(graph, 'a', addExtensions(createBundle('Task A.'), [termExt]));
      graph = addNode(graph, 'b', addExtensions(createBundle('Task B.'), [termExt]));

      // Apply bindings across all nodes using curried helper
      const bound = mapNodes(graph, withBindings({ terms: 'glossary data' }));

      expect(pendingSlots(getNode(bound, 'a'))).toEqual([]);
      expect(pendingSlots(getNode(bound, 'b'))).toEqual([]);
      expect(getNode(bound, 'a').bindings.terms).toBe('glossary data');
      expect(getNode(bound, 'b').bindings.terms).toBe('glossary data');
    });
  });

  describe('mapNodesAsync', () => {
    it('should transform every bundle asynchronously', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const mapped = await mapNodesAsync(graph, async (bundle, name) => {
        // Simulate async work (e.g. LLM call)
        await new Promise((r) => setTimeout(r, 1));
        return setDescription(bundle, { purpose: `async-${name}` });
      });

      expect(getNode(mapped, 'a').description).toEqual({ purpose: 'async-a' });
      expect(getNode(mapped, 'b').description).toEqual({ purpose: 'async-b' });
      expect(mapped.edges).toEqual(graph.edges);
    });

    it('should run transformations in parallel', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));

      const callOrder = [];

      const mapped = await mapNodesAsync(graph, async (bundle, name) => {
        callOrder.push(`start-${name}`);
        await new Promise((r) => setTimeout(r, 10));
        callOrder.push(`end-${name}`);
        return setDescription(bundle, { purpose: name });
      });

      // All starts should happen before any end (parallel execution)
      const firstEnd = callOrder.findIndex((e) => e.startsWith('end-'));
      const starts = callOrder.slice(0, firstEnd);
      expect(starts).toHaveLength(3);
      expect(starts.every((s) => s.startsWith('start-'))).toBe(true);

      expect(Object.keys(mapped.nodes)).toHaveLength(3);
    });

    it('should preserve edges unchanged', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'data' });

      const mapped = await mapNodesAsync(graph, async (bundle) => bundle);

      expect(mapped.edges).toEqual([{ from: 'a', to: 'b', slot: 'data' }]);
    });
  });

  describe('filterNodes', () => {
    it('should keep only nodes matching the predicate', () => {
      let graph = createGraph();
      graph = addNode(graph, 'ready', makeBundle('Ready.', [ext()], { medical_terms: 'data' }));
      graph = addNode(
        graph,
        'pending',
        makeBundle('Pending.', [ext({ id: 'ctx-b', slot: 'missing' })])
      );
      graph = addNode(graph, 'also-ready', createBundle('Plain.'));

      const filtered = filterNodes(graph, (bundle) => {
        const pending = bundle.extensions.filter((e) => !(e.slot in bundle.bindings));
        return pending.length === 0;
      });

      expect(Object.keys(filtered.nodes).sort()).toEqual(['also-ready', 'ready']);
    });

    it('should exclude edges with endpoints outside the kept set', () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });

      const filtered = filterNodes(graph, (_, name) => name !== 'b');

      expect(Object.keys(filtered.nodes).sort()).toEqual(['a', 'c']);
      expect(filtered.edges).toEqual([]);
    });

    it('should pass node name as second argument to predicate', () => {
      let graph = addNode(
        addNode(createGraph(), 'keep', createBundle('K')),
        'drop',
        createBundle('D')
      );

      const filtered = filterNodes(graph, (_, name) => name === 'keep');

      expect(Object.keys(filtered.nodes)).toEqual(['keep']);
    });
  });

  describe('execute', () => {
    it('should run nodes in build order and return results', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Prompt A.'));
      graph = addNode(graph, 'b', createBundle('Prompt B.'));

      const runner = vi.fn().mockResolvedValueOnce('result-a').mockResolvedValueOnce('result-b');

      const results = await execute(graph, runner);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results.a).toBe('result-a');
      expect(results.b).toBe('result-b');
      expect(runner).toHaveBeenCalledTimes(2);
    });

    it('should wire upstream outputs into downstream slots', async () => {
      // A produces output → feeds B's "entities" slot
      const bBundle = makeBundle('Analyze entities.', [
        ext({ id: 'ctx-entities', slot: 'entities', preamble: 'Entities:\n{{entities}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'extractor', createBundle('Extract entities.'));
      graph = addNode(graph, 'analyzer', bBundle);
      graph = connect(graph, { from: 'extractor', to: 'analyzer', slot: 'entities' });

      const runner = vi
        .fn()
        .mockResolvedValueOnce('Person: Alice, Org: Acme')
        .mockResolvedValueOnce('analysis-result');

      const results = await execute(graph, runner);

      expect(results.extractor).toBe('Person: Alice, Org: Acme');
      expect(results.analyzer).toBe('analysis-result');

      // Verify the analyzer received a prompt with the wired slot filled
      const analyzerPrompt = runner.mock.calls[1][1];
      expect(analyzerPrompt).toContain('Person: Alice, Org: Acme');
      expect(analyzerPrompt).toContain('Analyze entities.');
    });

    it('should wire multiple upstream outputs into a single downstream node', async () => {
      const joinBundle = makeBundle('Combine results.', [
        ext({ id: 'ctx-a', slot: 'data_a', preamble: 'From A:\n{{data_a}}' }),
        ext({ id: 'ctx-b', slot: 'data_b', preamble: 'From B:\n{{data_b}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Source A.'));
      graph = addNode(graph, 'b', createBundle('Source B.'));
      graph = addNode(graph, 'join', joinBundle);
      graph = connect(graph, { from: 'a', to: 'join', slot: 'data_a' });
      graph = connect(graph, { from: 'b', to: 'join', slot: 'data_b' });

      const runner = vi
        .fn()
        .mockResolvedValueOnce('output-a')
        .mockResolvedValueOnce('output-b')
        .mockResolvedValueOnce('joined');

      const results = await execute(graph, runner);

      const joinPrompt = runner.mock.calls[2][1];
      expect(joinPrompt).toContain('output-a');
      expect(joinPrompt).toContain('output-b');
      expect(results.join).toBe('joined');
    });

    it('should stringify non-string results for slot filling', async () => {
      const consumerBundle = makeBundle('Process.', [
        ext({ id: 'ctx-data', slot: 'data', preamble: 'Data:\n{{data}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'source', createBundle('Generate.'));
      graph = addNode(graph, 'consumer', consumerBundle);
      graph = connect(graph, { from: 'source', to: 'consumer', slot: 'data' });

      const runner = vi
        .fn()
        .mockResolvedValueOnce({ entities: ['Alice', 'Bob'], count: 2 })
        .mockResolvedValueOnce('processed');

      await execute(graph, runner);

      const consumerPrompt = runner.mock.calls[1][1];
      expect(consumerPrompt).toContain('"Alice"');
      expect(consumerPrompt).toContain('"Bob"');
    });

    it('should pass the wired bundle to the runner', async () => {
      const bBundle = makeBundle('Task.', [
        ext({ id: 'ctx-input', slot: 'input', preamble: 'Input:\n{{input}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Source.'));
      graph = addNode(graph, 'b', bBundle);
      graph = connect(graph, { from: 'a', to: 'b', slot: 'input' });

      const runner = vi.fn().mockResolvedValueOnce('source-output').mockResolvedValueOnce('done');

      await execute(graph, runner);

      // Runner receives (name, prompt, bundle)
      const [name, , bundle] = runner.mock.calls[1];
      expect(name).toBe('b');
      expect(bundle.bindings.input).toBe('source-output');
    });

    it('should emit progress events during execution', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });

      const runner = vi.fn().mockResolvedValue('ok');
      const onProgress = vi.fn();

      await execute(graph, runner, { onProgress });

      const events = onProgress.mock.calls.map((c) => c[0]);
      const graphEvents = events.filter((e) => e.step === 'prompt-graph');

      const executing = graphEvents.find((e) => e.stepName === 'executing');
      expect(executing).toBeDefined();
      expect(executing.nodeCount).toBe(2);

      const nodeEvents = graphEvents.filter((e) => e.stepName === 'running-node');
      expect(nodeEvents).toHaveLength(2);
      expect(nodeEvents[0].name).toBe('a');
      expect(nodeEvents[1].name).toBe('b');
      expect(nodeEvents[1].wiredSlots).toEqual(['x']);

      const complete = graphEvents.find((e) => e.event === 'complete');
      expect(complete).toBeDefined();
      expect(complete.nodeCount).toBe(2);
    });

    it('should skip cycle nodes', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'safe', createBundle('Safe'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'a', slot: 'y' });

      const runner = vi.fn().mockResolvedValue('ok');
      const results = await execute(graph, runner);

      expect(Object.keys(results)).toEqual(['safe']);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('should preserve existing bindings alongside wired upstream data', async () => {
      const bBundle = makeBundle(
        'Task.',
        [
          ext({ id: 'ctx-existing', slot: 'static_data', preamble: 'Static:\n{{static_data}}' }),
          ext({ id: 'ctx-dynamic', slot: 'dynamic', preamble: 'Dynamic:\n{{dynamic}}' }),
        ],
        { static_data: 'pre-filled value' }
      );

      let graph = createGraph();
      graph = addNode(graph, 'source', createBundle('Generate.'));
      graph = addNode(graph, 'consumer', bBundle);
      graph = connect(graph, { from: 'source', to: 'consumer', slot: 'dynamic' });

      const runner = vi.fn().mockResolvedValueOnce('live-data').mockResolvedValueOnce('done');

      await execute(graph, runner);

      const consumerPrompt = runner.mock.calls[1][1];
      expect(consumerPrompt).toContain('pre-filled value');
      expect(consumerPrompt).toContain('live-data');
    });

    it('should abort between nodes when abortSignal is triggered', async () => {
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });

      const controller = new AbortController();

      const runner = vi.fn().mockImplementation(async (name) => {
        if (name === 'b') controller.abort(new Error('cancelled'));
        return `result-${name}`;
      });

      await expect(execute(graph, runner, { abortSignal: controller.signal })).rejects.toThrow(
        'cancelled'
      );

      // A and B ran, C was aborted before execution
      expect(runner).toHaveBeenCalledTimes(2);
      expect(runner.mock.calls[0][0]).toBe('a');
      expect(runner.mock.calls[1][0]).toBe('b');
    });

    it('should abort immediately when signal is already aborted', async () => {
      let graph = addNode(createGraph(), 'a', createBundle('A'));

      const controller = new AbortController();
      controller.abort(new Error('pre-aborted'));

      const runner = vi.fn();

      await expect(execute(graph, runner, { abortSignal: controller.signal })).rejects.toThrow(
        'pre-aborted'
      );

      expect(runner).not.toHaveBeenCalled();
    });
  });

  describe('reexecute', () => {
    it('should only re-run changed nodes and their downstream', async () => {
      // A → B → C pipeline
      const bBundle = makeBundle('Process.', [
        ext({ id: 'ctx-input', slot: 'input', preamble: 'Input:\n{{input}}' }),
      ]);
      const cBundle = makeBundle('Finalize.', [
        ext({ id: 'ctx-data', slot: 'data', preamble: 'Data:\n{{data}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Source.'));
      graph = addNode(graph, 'b', bBundle);
      graph = addNode(graph, 'c', cBundle);
      graph = connect(graph, { from: 'a', to: 'b', slot: 'input' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'data' });

      const previous = { a: 'old-a', b: 'old-b', c: 'old-c' };

      // Only B changed — should re-run B and C, reuse A
      const runner = vi.fn().mockResolvedValueOnce('new-b').mockResolvedValueOnce('new-c');

      const results = await reexecute(graph, runner, ['b'], { previous });

      // Runner called only for B and C
      expect(runner).toHaveBeenCalledTimes(2);
      expect(runner.mock.calls[0][0]).toBe('b');
      expect(runner.mock.calls[1][0]).toBe('c');

      // A preserved from previous, B and C updated
      expect(results.a).toBe('old-a');
      expect(results.b).toBe('new-b');
      expect(results.c).toBe('new-c');
    });

    it('should wire previous upstream results into re-run nodes', async () => {
      const bBundle = makeBundle('Analyze.', [
        ext({ id: 'ctx-input', slot: 'input', preamble: 'Input:\n{{input}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('Source.'));
      graph = addNode(graph, 'b', bBundle);
      graph = connect(graph, { from: 'a', to: 'b', slot: 'input' });

      const previous = { a: 'upstream-data', b: 'old-analysis' };

      // Only B changed — A's result should be wired in
      const runner = vi.fn().mockResolvedValueOnce('new-analysis');

      await reexecute(graph, runner, ['b'], { previous });

      const bPrompt = runner.mock.calls[0][1];
      expect(bPrompt).toContain('upstream-data');
    });

    it('should cascade through multiple levels of downstream', async () => {
      // A → B → C → D
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = addNode(graph, 'd', createBundle('D'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'y' });
      graph = connect(graph, { from: 'c', to: 'd', slot: 'z' });

      const previous = { a: 'a1', b: 'b1', c: 'c1', d: 'd1' };

      // Change A — should re-run A, B, C, D
      const runner = vi.fn().mockResolvedValue('updated');
      const results = await reexecute(graph, runner, ['a'], { previous });

      expect(runner).toHaveBeenCalledTimes(4);
      expect(results.a).toBe('updated');
      expect(results.b).toBe('updated');
      expect(results.c).toBe('updated');
      expect(results.d).toBe('updated');
    });

    it('should handle changing a leaf node without affecting others', async () => {
      // A → B, A → C (independent leaves)
      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', createBundle('C'));
      graph = connect(graph, { from: 'a', to: 'b', slot: 'x' });
      graph = connect(graph, { from: 'a', to: 'c', slot: 'y' });

      const previous = { a: 'a1', b: 'b1', c: 'c1' };

      // Change only C — should re-run C only
      const runner = vi.fn().mockResolvedValueOnce('c2');
      const results = await reexecute(graph, runner, ['c'], { previous });

      expect(runner).toHaveBeenCalledTimes(1);
      expect(results.a).toBe('a1');
      expect(results.b).toBe('b1');
      expect(results.c).toBe('c2');
    });

    it('should handle multiple changed nodes', async () => {
      // A → C, B → C
      const cBundle = makeBundle('Join.', [
        ext({ id: 'ctx-a', slot: 'from_a', preamble: 'A:\n{{from_a}}' }),
        ext({ id: 'ctx-b', slot: 'from_b', preamble: 'B:\n{{from_b}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'a', createBundle('A'));
      graph = addNode(graph, 'b', createBundle('B'));
      graph = addNode(graph, 'c', cBundle);
      graph = connect(graph, { from: 'a', to: 'c', slot: 'from_a' });
      graph = connect(graph, { from: 'b', to: 'c', slot: 'from_b' });

      const previous = { a: 'a1', b: 'b1', c: 'c1' };

      // Both A and B changed — should re-run all three
      const runner = vi.fn().mockResolvedValue('new');
      const results = await reexecute(graph, runner, ['a', 'b'], { previous });

      expect(runner).toHaveBeenCalledTimes(3);
      expect(results.a).toBe('new');
      expect(results.b).toBe('new');
      expect(results.c).toBe('new');
    });

    it('should work with full workflow: execute then reexecute', async () => {
      const bBundle = makeBundle('Analyze.', [
        ext({ id: 'ctx-input', slot: 'input', preamble: 'Input:\n{{input}}' }),
      ]);

      let graph = createGraph();
      graph = addNode(graph, 'source', createBundle('Generate data.'));
      graph = addNode(graph, 'analyzer', bBundle);
      graph = connect(graph, { from: 'source', to: 'analyzer', slot: 'input' });

      // First full execution
      const runner1 = vi.fn().mockResolvedValueOnce('data-v1').mockResolvedValueOnce('analysis-v1');

      const firstResults = await execute(graph, runner1);

      expect(firstResults.source).toBe('data-v1');
      expect(firstResults.analyzer).toBe('analysis-v1');

      // Update the source node's bundle
      graph = addNode(graph, 'source', createBundle('Generate updated data.'));

      // Re-execute only changed node
      const runner2 = vi.fn().mockResolvedValueOnce('data-v2').mockResolvedValueOnce('analysis-v2');

      const secondResults = await reexecute(graph, runner2, ['source'], { previous: firstResults });

      expect(runner2).toHaveBeenCalledTimes(2);
      expect(secondResults.source).toBe('data-v2');
      expect(secondResults.analyzer).toBe('analysis-v2');
    });
  });
});
