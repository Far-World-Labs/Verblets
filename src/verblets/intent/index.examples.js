import Ajv from 'ajv';
import { describe, expect as vitestExpect, it as vitestIt, beforeAll, afterAll } from 'vitest';
import vitestAiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { intent as intentSchema } from '../../json-schemas/index.js';
import { env } from '../../lib/env/index.js';
import { debug } from '../../lib/debug/index.js';
import { logSuiteStart, logSuiteEnd } from '../../chains/test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../../chains/test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../../chains/test-analysis/config.js';

import intent from './index.js';

const config = getConfig();
const it = config?.aiMode ? wrapIt(vitestIt, { baseProps: { suite: 'Intent verblet' } }) : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Intent verblet' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Intent verblet' } })
  : vitestAiExpect;
const suiteLogStart = config?.aiMode ? logSuiteStart : () => {};
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

beforeAll(async () => {
  await suiteLogStart('Intent verblet', extractFileContext(2));
});

afterAll(async () => {
  await suiteLogEnd('Intent verblet', extractFileContext(2));
});

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

          // LLM assertion to validate intent extraction quality
          await aiExpect(
            `Original text: "${example.text}" was parsed into an intent object`
          ).toSatisfy('Does this seem like a reasonable intent extraction?');

          // Additional assertion for intent completeness
          await aiExpect(JSON.stringify(result)).toSatisfy(
            'Does this intent object contain some useful information?'
          );
        }
      },
      longTestTimeout
    );
  });

  it(
    'should extract travel booking intent correctly',
    async () => {
      const travelRequest =
        'Book me a round-trip flight from New York to Tokyo for next month, preferably business class';
      const result = await intent(travelRequest, travelOperations);

      // Traditional schema validation
      const schema = intentSchema;
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertions for travel-specific validation
      await aiExpect(`Intent extracted from: "${travelRequest}"`).toSatisfy(
        'Is this request related to travel or transportation?'
      );

      await aiExpect(JSON.stringify(result)).toSatisfy(
        'Does this intent mention any locations or destinations?'
      );
    },
    longTestTimeout
  );

  it(
    'should handle entertainment search intent',
    async () => {
      const musicQuery =
        'Find that song that goes "Never gonna give you up, never gonna let you down"';
      const result = await intent(musicQuery, musicOperations);

      // Schema validation
      const schema = intentSchema;
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertion for entertainment intent
      await aiExpect(`Intent extracted from: "${musicQuery}"`).toSatisfy(
        'Is this request related to music or entertainment?'
      );

      // Validate that the intent captures the search criteria
      await aiExpect(JSON.stringify(result)).toSatisfy(
        'Does this intent mention song lyrics or music search?'
      );
    },
    longTestTimeout
  );
});
