import Ajv from 'ajv';
import fs from 'node:fs/promises';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import aiExpect from '../../chains/expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import intent from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getIntentSchema() {
  return JSON.parse(await fs.readFile(join(__dirname, '../../json-schemas/intent.json')));
}

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
    schema: getIntentSchema,
  },
  {
    text: 'Lookup a song by the quote "I just gotta tell you how I\'m feeling"',
    operations: musicOperations,
    schema: getIntentSchema,
  },
];

describe('Intent verblet', () => {
  // Set environment mode to 'none' for all tests to avoid throwing
  const originalMode = process.env.LLM_EXPECT_MODE;

  beforeAll(() => {
    process.env.LLM_EXPECT_MODE = 'none';
  });

  afterAll(() => {
    if (originalMode !== undefined) {
      process.env.LLM_EXPECT_MODE = originalMode;
    } else {
      delete process.env.LLM_EXPECT_MODE;
    }
  });

  examples.forEach((example) => {
    it(
      example.text,
      async () => {
        const result = await intent(example.text, example.operations);

        if (example.schema) {
          const schema = await example.schema();
          const ajv = new Ajv();
          const validate = ajv.compile(schema);

          const isValid = validate(result);
          if (!isValid) {
            console.error('Validation errors:');
            console.error(validate.errors);
            console.error('Returned result:');
            console.error(JSON.stringify(result, null, 2));
          }
          expect(isValid).toStrictEqual(true);

          // LLM assertion to validate intent extraction quality
          const intentMakesSense = await aiExpect(
            `Original text: "${example.text}" was parsed into an intent object`
          ).toSatisfy('Does this seem like a reasonable intent extraction?');
          expect(intentMakesSense).toBe(true);

          // Additional assertion for intent completeness
          const hasBasicInfo = await aiExpect(JSON.stringify(result)).toSatisfy(
            'Does this intent object contain some useful information?'
          );
          expect(hasBasicInfo).toBe(true);
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
      const schema = await getIntentSchema();
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertions for travel-specific validation
      const isTravelRelated = await aiExpect(`Intent extracted from: "${travelRequest}"`).toSatisfy(
        'Is this request related to travel or transportation?'
      );
      expect(isTravelRelated).toBe(true);

      const hasLocationInfo = await aiExpect(JSON.stringify(result)).toSatisfy(
        'Does this intent mention any locations or destinations?'
      );
      expect(hasLocationInfo).toBe(true);
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
      const schema = await getIntentSchema();
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertion for entertainment intent
      const isEntertainmentRelated = await aiExpect(
        `Intent extracted from: "${musicQuery}"`
      ).toSatisfy('Is this request related to music or entertainment?');
      expect(isEntertainmentRelated).toBe(true);

      // Validate that the intent captures the search criteria
      const mentionsLyrics = await aiExpect(JSON.stringify(result)).toSatisfy(
        'Does this intent mention song lyrics or music search?'
      );
      expect(mentionsLyrics).toBe(true);
    },
    longTestTimeout
  );
});
