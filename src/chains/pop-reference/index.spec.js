import { describe, it, expect, vi, beforeEach } from 'vitest';
import popReference from './index.js';
import chatGPT from '../../lib/chatgpt/index.js';

// Mock dependencies
vi.mock('../../lib/chatgpt/index.js', () => ({
  default: vi.fn(),
}));

// Mock fs/promises for schema loading
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(
      JSON.stringify({
        type: 'object',
        properties: {
          references: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        required: ['references'],
        additionalProperties: false,
      })
    ),
  },
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      type: 'object',
      properties: {
        references: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['references'],
      additionalProperties: false,
    })
  ),
}));

describe('popReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find pop culture references for a sentence', async () => {
    const mockResponse = {
      references: [
        {
          reference: 'when Neo takes the red pill',
          source: 'The Matrix',
          context: 'he chooses uncomfortable truth over comforting illusion',
          score: 0.88,
          match: {
            text: 'finally made a decision',
            start: 12,
            end: 35,
          },
        },
      ],
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await popReference(
      'She finally made a decision after months of doubt',
      'pivotal moment of choosing clarity over comfort'
    );

    expect(result).toEqual(mockResponse.references);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Find pop culture references'),
      expect.any(Object)
    );
  });

  it('should include specific sources when provided', async () => {
    const mockResponse = {
      references: [
        {
          reference: "Michael Scott's 'That's what she said'",
          source: 'The Office',
          score: 0.75,
          match: {
            text: 'awkward silence',
            start: 20,
            end: 35,
          },
        },
      ],
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await popReference(
      'There was an awkward silence after the joke',
      'uncomfortable social moment',
      {
        include: ['The Office', 'Parks and Recreation'],
      }
    );

    expect(result).toEqual(mockResponse.references);
    expect(chatGPT).toHaveBeenCalledWith(expect.stringContaining('<sources>'), expect.any(Object));
  });

  it('should handle weighted sources', async () => {
    const mockResponse = {
      references: [
        {
          reference: "when the guy in the 'this is fine' meme just sits in the fire",
          source: 'Meme: This Is Fine',
          score: 0.83,
          match: {
            text: 'kept smiling',
            start: 5,
            end: 17,
          },
        },
      ],
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await popReference(
      'They kept smiling through the chaos',
      'maintaining composure during disaster',
      {
        include: [
          { reference: 'Internet Memes', percent: 80 },
          { reference: 'The Office', percent: 20 },
        ],
      }
    );

    expect(result).toEqual(mockResponse.references);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Internet Memes (focus 80%)'),
      expect.any(Object)
    );
  });

  it('should include context when requested', async () => {
    const mockResponse = {
      references: [
        {
          reference: "when Darth Vader reveals he's Luke's father",
          source: 'Star Wars',
          context: 'shocking revelation that changes everything',
          score: 0.92,
          match: {
            text: 'truth was revealed',
            start: 10,
            end: 28,
          },
        },
      ],
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await popReference(
      'When the truth was revealed, everything changed',
      'shocking revelation moment',
      {
        referenceContext: true,
      }
    );

    expect(result).toEqual(mockResponse.references);
    expect(result[0].context).toBeDefined();
  });

  it('should respect referencesPerSource option', async () => {
    const mockResponse = {
      references: [
        {
          reference: "Harry's scar burning",
          source: 'Harry Potter',
          score: 0.8,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
        {
          reference: 'Hermione raising her hand',
          source: 'Harry Potter',
          score: 0.7,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
        {
          reference: "Ron's face when he sees spiders",
          source: 'Harry Potter',
          score: 0.65,
          match: { text: 'warning sign', start: 10, end: 22 },
        },
      ],
    };

    chatGPT.mockResolvedValue(mockResponse);

    const result = await popReference(
      'It was a warning sign of things to come',
      'ominous foreshadowing',
      {
        include: ['Harry Potter'],
        referencesPerSource: 3,
      }
    );

    expect(result.length).toBe(3);
    expect(chatGPT).toHaveBeenCalledWith(
      expect.stringContaining('Find 3 references per source'),
      expect.any(Object)
    );
  });

  it('should handle custom LLM configuration', async () => {
    const mockResponse = { references: [] };
    chatGPT.mockResolvedValue(mockResponse);

    await popReference('Test sentence', 'Test description', {
      llm: { modelName: 'custom-model', temperature: 0.5 },
    });

    expect(chatGPT).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        modelOptions: expect.objectContaining({
          modelName: 'custom-model',
          temperature: 0.5,
        }),
      })
    );
  });

  it('should handle parsing errors gracefully', async () => {
    chatGPT.mockResolvedValue('invalid json');

    await expect(popReference('Test', 'Description')).rejects.toThrow();
  });

  it('should handle empty reference arrays', async () => {
    chatGPT.mockResolvedValue({ references: [] });

    const result = await popReference('A very unique situation', 'no clear pop culture parallels');

    expect(result).toEqual([]);
  });
});
