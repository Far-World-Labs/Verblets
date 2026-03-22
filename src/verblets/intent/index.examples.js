import Ajv from 'ajv';
import { describe } from 'vitest';

import { intent as intentSchema } from '../../json-schemas/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { debug } from '../../lib/debug/index.js';
import { getTestHelpers } from '../../chains/test-analysis/test-wrappers.js';

import intent from './index.js';

const { it, expect, aiExpect } = getTestHelpers('Intent verblet');

const travelOperations = [
  {
    name: 'book_flight',
    description: 'Book a flight ticket',
    parameters: {
      from: 'departure location',
      to: 'destination location',
      date: 'travel date',
      class: 'travel class (economy, business, first)',
    },
  },
  {
    name: 'book_hotel',
    description: 'Book a hotel room',
    parameters: {
      location: 'city or area',
      checkin: 'check-in date',
      checkout: 'check-out date',
      guests: 'number of guests',
    },
  },
];

const musicOperations = [
  {
    name: 'search_song',
    description: 'Search for a song by lyrics or title',
    parameters: {
      lyrics: 'song lyrics',
      title: 'song title',
      artist: 'artist name',
    },
  },
  {
    name: 'play_music',
    description: 'Play music',
    parameters: {
      genre: 'music genre',
      artist: 'specific artist',
      playlist: 'playlist name',
    },
  },
];

const examples = [
  {
    text: 'Give me a flight to Burgas',
    operations: travelOperations,
    schema: () => intentSchema,
  },
  {
    text: 'Lookup a song by the quote "I just gotta tell you how I\'m feeling"',
    operations: musicOperations,
    schema: () => intentSchema,
  },
];

describe('Intent verblet', () => {
  examples.forEach((example) => {
    it(
      example.text,
      async () => {
        const result = await intent(example.text, example.operations);
        debug('Intent test:', `${example.text.substring(0, 50)}...`);
        debug('Result:', `${JSON.stringify(result, null, 2).substring(0, 200)}...`);

        if (example.schema) {
          const schema = await example.schema();
          const ajv = new Ajv();
          const validate = ajv.compile(schema);

          const isValid = validate(result);
          if (!isValid) {
            debug('Validation FAILED - errors:', validate.errors);
          }
          expect(isValid).toStrictEqual(true);

          await aiExpect(result).toSatisfy(
            `a reasonable intent extraction from: "${example.text}"`
          );
        }
      },
      longTestTimeout
    );
  });
});
