import { Factory } from 'fishery';
import { makeResponseVariants } from './variants.js';

/**
 * Factories for pop-reference's LLM responses.
 *
 * Shape (per `src/chains/pop-reference/pop-reference-result.json`):
 *   { references: [ { reference, source, score, match: { text, start, end }, context? } ] }
 *
 * Variant naming follows the project-wide vocabulary:
 *   wellFormed, empty, isNull, undefinedValue, malformedShape, rejected,
 *   undersized, oversized.
 *
 * Each variant is a thunk so callers can pass it directly to `mockResolvedValue`,
 * `mockImplementation`, etc., without having to remember whether to call it.
 */

const SOURCES = ['The Matrix', 'The Office', 'Lord of the Rings', 'Star Wars', 'Internet Memes'];

export const popReferenceMatchFactory = Factory.define(({ sequence }) => ({
  text: `fragment-${sequence}`,
  start: sequence,
  end: sequence + 8,
}));

export const popReferenceFactory = Factory.define(({ sequence }) => ({
  reference: `cultural moment #${sequence}`,
  source: SOURCES[sequence % SOURCES.length],
  score: 0.5 + (sequence % 5) * 0.1,
  match: popReferenceMatchFactory.build(),
}));

export const popReferenceResponseFactory = Factory.define(() => ({
  references: popReferenceFactory.buildList(2),
}));

export const popReferenceVariants = makeResponseVariants({
  base: popReferenceResponseFactory,
  arrayKey: 'references',
  makeArrayItem: () => popReferenceFactory.build(),
});

/** Convenience: build a response with N references at construction time. */
export const popReferenceWithCount = (n) =>
  popReferenceResponseFactory.build({ references: popReferenceFactory.buildList(n) });
