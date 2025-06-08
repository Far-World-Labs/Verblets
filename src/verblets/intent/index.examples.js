import Ajv from 'ajv';
import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { longTestTimeout } from '../../constants/common.js';
import { expect as llmExpect } from '../llm-expect/index.js';
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
          const [intentMakesense] = await llmExpect(
            { originalText: example.inputs.text, extractedIntent: result },
            "Does the extracted intent accurately capture the user's request from the original text?"
          );
          expect(intentMakesense).toBe(true);

          // Additional assertion for intent completeness
          const [isComplete] = await llmExpect(
            result,
            'Does this intent object contain sufficient detail to be actionable?'
          );
          expect(isComplete).toBe(true);
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
      const [isTravelIntent] = await llmExpect(
        result,
        'Does this intent clearly represent a travel booking request with specific details?'
      );
      expect(isTravelIntent).toBe(true);

      const [hasKeyDetails] = await llmExpect(
        result,
        'Does this travel intent include origin, destination, and class preference information?'
      );
      expect(hasKeyDetails).toBe(true);
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
      const [isEntertainmentIntent] = await llmExpect(
        result,
        'Does this intent represent a music or entertainment search request?'
      );
      expect(isEntertainmentIntent).toBe(true);

      // Validate that the intent captures the search criteria
      const [capturesLyrics] = await llmExpect(
        { query: musicQuery, intent: result },
        'Does the extracted intent preserve the lyrical search criteria from the original query?'
      );
      expect(capturesLyrics).toBe(true);
    },
    longTestTimeout
  );
});
