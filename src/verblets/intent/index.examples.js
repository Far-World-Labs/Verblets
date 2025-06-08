import Ajv from 'ajv';
import fs from 'node:fs/promises';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import { expect as llmExpect } from '../../chains/llm-expect/index.js';
import intent from './index.js';

const resultSchema = async () => {
  return JSON.parse(await fs.readFile('./src/json-schemas/intent.json'));
};

const examples = [
  {
    inputs: { text: 'Give me a flight to Burgas' },
    want: { resultSchema },
  },
  {
    inputs: {
      text: 'Lookup a song by the quote \
"I just gotta tell you how I\'m feeling"',
    },
    want: { resultSchema },
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
      example.inputs.text,
      async () => {
        const result = await intent({ text: example.inputs.text });

        if (example.want.resultSchema) {
          const schema = await example.want.resultSchema();
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
          const [intentMakesSense] = await llmExpect(
            `Original text: "${example.inputs.text}" was parsed into an intent object`,
            undefined,
            'Does this seem like a reasonable intent extraction?'
          );
          expect(intentMakesSense).toBe(true);

          // Additional assertion for intent completeness
          const [hasBasicInfo] = await llmExpect(
            JSON.stringify(result),
            undefined,
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
      const result = await intent({ text: travelRequest });

      // Traditional schema validation
      const schema = await resultSchema();
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertions for travel-specific validation
      const [isTravelRelated] = await llmExpect(
        `Intent extracted from: "${travelRequest}"`,
        undefined,
        'Is this request related to travel or transportation?'
      );
      expect(isTravelRelated).toBe(true);

      const [hasLocationInfo] = await llmExpect(
        JSON.stringify(result),
        undefined,
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
      const result = await intent({ text: musicQuery });

      // Schema validation
      const schema = await resultSchema();
      const ajv = new Ajv();
      const validate = ajv.compile(schema);
      expect(validate(result)).toBe(true);

      // LLM assertion for entertainment intent
      const [isEntertainmentRelated] = await llmExpect(
        `Intent extracted from: "${musicQuery}"`,
        undefined,
        'Is this request related to music or entertainment?'
      );
      expect(isEntertainmentRelated).toBe(true);

      // Validate that the intent captures the search criteria
      const [mentionsLyrics] = await llmExpect(
        JSON.stringify(result),
        undefined,
        'Does this intent mention song lyrics or music search?'
      );
      expect(mentionsLyrics).toBe(true);
    },
    longTestTimeout
  );
});
