import { describe, it, expect } from 'vitest';
import {
  connectParts,
  runOrder,
  connectDownstream,
  connectUpstream,
  detectCycles,
} from './routing.js';

const inst = (name, sourceTags, inputs = [], pinned) => ({
  name,
  sourceTags,
  inputs,
  ...(pinned ? { pinned } : {}),
});

const input = (overrides = {}) => ({
  id: 'ctx-data',
  tags: ['output', 'entities'],
  ...overrides,
});

describe('prompt-routing', () => {
  describe('connectParts', () => {
    it('should derive connections from tag matching', () => {
      const instances = [inst('producer', ['output', 'entities']), inst('consumer', [], [input()])];

      const edges = connectParts(instances);
      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({ from: 'producer', to: 'consumer', inputId: 'ctx-data' });
    });

    it('should not derive self-connections', () => {
      const instances = [inst('self', ['output', 'entities'], [input()])];
      expect(connectParts(instances)).toEqual([]);
    });

    it('should skip pinned inputs', () => {
      const instances = [
        inst('producer', ['output', 'entities']),
        inst('consumer', [], [input()], new Set(['ctx-data'])),
      ];
      expect(connectParts(instances)).toEqual([]);
    });

    it('should require all tags to match (AND semantics)', () => {
      const instances = [
        inst('producer', ['output']),
        inst('consumer', [], [input({ tags: ['output', 'entities'] })]),
      ];
      expect(connectParts(instances)).toEqual([]);
    });

    it('should skip inputs with no tags', () => {
      const instances = [inst('producer', ['output']), inst('consumer', [], [input({ tags: [] })])];
      expect(connectParts(instances)).toEqual([]);
    });

    it('should derive multiple connections for multiple matching inputs', () => {
      const instances = [
        inst('producer', ['output', 'entities', 'medical']),
        inst(
          'consumer',
          [],
          [
            input({ id: 'ctx-entities', tags: ['output', 'entities'] }),
            input({ id: 'ctx-medical', tags: ['output', 'medical'] }),
          ]
        ),
      ];
      expect(connectParts(instances)).toHaveLength(2);
    });
  });

  describe('runOrder', () => {
    it('should return names in dependency order', () => {
      const edges = [
        { from: 'source', to: 'middle' },
        { from: 'middle', to: 'sink' },
      ];
      const order = runOrder(['source', 'middle', 'sink'], edges);
      expect(order.indexOf('source')).toBeLessThan(order.indexOf('middle'));
      expect(order.indexOf('middle')).toBeLessThan(order.indexOf('sink'));
    });

    it('should handle independent names in any order', () => {
      const order = runOrder(['a', 'b'], []);
      expect(order).toHaveLength(2);
      expect(order).toContain('a');
      expect(order).toContain('b');
    });

    it('should handle diamond dependencies', () => {
      const edges = [
        { from: 'root', to: 'left' },
        { from: 'root', to: 'right' },
        { from: 'left', to: 'join' },
        { from: 'right', to: 'join' },
      ];
      const order = runOrder(['root', 'left', 'right', 'join'], edges);
      expect(order.indexOf('root')).toBeLessThan(order.indexOf('left'));
      expect(order.indexOf('root')).toBeLessThan(order.indexOf('right'));
      expect(order.indexOf('left')).toBeLessThan(order.indexOf('join'));
      expect(order.indexOf('right')).toBeLessThan(order.indexOf('join'));
    });

    it('should exclude names in cycles', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ];
      const order = runOrder(['a', 'b', 'safe'], edges);
      expect(order).toEqual(['safe']);
    });

    it('should return empty for empty input', () => {
      expect(runOrder([], [])).toEqual([]);
    });
  });

  describe('connectDownstream', () => {
    it('should return all transitively downstream names', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'd' },
      ];
      expect(connectDownstream(edges, 'a').sort()).toEqual(['b', 'c', 'd']);
    });

    it('should not include the source name', () => {
      expect(connectDownstream([], 'a')).toEqual([]);
    });

    it('should return empty for leaf names', () => {
      const edges = [{ from: 'a', to: 'b' }];
      expect(connectDownstream(edges, 'b')).toEqual([]);
    });

    it('should handle convergent paths without duplicates', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'c' },
      ];
      expect(connectDownstream(edges, 'a').sort()).toEqual(['b', 'c']);
    });

    it('should accept an array of starting names', () => {
      const edges = [
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
      ];
      expect(connectDownstream(edges, ['a', 'b']).sort()).toEqual(['c', 'd']);
    });
  });

  describe('connectUpstream', () => {
    it('should return all transitively upstream names', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ];
      expect(connectUpstream(edges, 'c').sort()).toEqual(['a', 'b']);
    });

    it('should not include the target name', () => {
      expect(connectUpstream([], 'a')).toEqual([]);
    });

    it('should accept an array of target names', () => {
      const edges = [
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
      ];
      expect(connectUpstream(edges, ['c', 'd']).sort()).toEqual(['a', 'b']);
    });

    it('should be the mirror of connectDownstream', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
      ];
      expect(connectDownstream(edges, 'a').sort()).toEqual(['b', 'c', 'd']);
      expect(connectUpstream(edges, 'd').sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('detectCycles', () => {
    it('should return valid for acyclic connections', () => {
      const edges = [{ from: 'a', to: 'b' }];
      const result = detectCycles(['a', 'b'], edges);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect cycles', () => {
      const edges = [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ];
      const result = detectCycles(['a', 'b'], edges);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('cycle'));
    });

    it('should return valid for empty input', () => {
      expect(detectCycles([], []).valid).toBe(true);
    });

    it('should return valid for independent names', () => {
      expect(detectCycles(['a', 'b', 'c'], []).valid).toBe(true);
    });
  });
});
