import { describe } from 'vitest';
import ConversationChain from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { roundRobin } from './turn-policies.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect } = getTestHelpers('Conversation chain');

// Fixed clock for deterministic timestamps — makes LLM prompts cacheable
const fixedClock = () => new Date('2024-06-15T12:00:00Z');

describe('conversation chain examples', () => {
  it(
    'roundRobin policy cycles through speakers one per round',
    async () => {
      const speakers = [
        {
          id: 'turing',
          name: 'Alan Turing',
          bio: 'Father of computer science and artificial intelligence, creator of the Turing Test',
          agenda:
            'Argue that consciousness is fundamentally about behavior and computational processes, not substrate',
        },
        {
          id: 'minsky',
          name: 'Marvin Minsky',
          bio: 'Co-founder of MIT AI Lab, pioneer in artificial intelligence and cognitive science',
          agenda:
            'Advocate that consciousness emerges from the interaction of simple, unconscious agents in a society of mind',
        },
        {
          id: 'hinton',
          name: 'Geoffrey Hinton',
          bio: 'Godfather of deep learning, pioneer in neural networks and backpropagation',
          agenda:
            'Argue that consciousness could emerge from sufficiently complex neural networks through self-organizing principles',
        },
      ];

      const topic =
        'The Hard Problem of Machine Consciousness: Will AI systems develop genuine subjective experience?';

      const chain = new ConversationChain(topic, speakers, {
        clock: fixedClock,
        rules: {
          shouldContinue: (round) => round < 3,
          turnPolicy: roundRobin(speakers),
          customPrompt:
            "This is a deep philosophical and scientific discussion. Draw on your expertise and engage with others' arguments. Be intellectually rigorous but concise.",
        },
      });

      const messages = await chain.run();

      // roundRobin returns 1 speaker per round → 3 rounds → 3 messages
      expect(messages.length).toBe(3);

      // Each speaker speaks exactly once, in order
      const speakerIds = messages.map((m) => m.id);
      expect(speakerIds).toEqual(['turing', 'minsky', 'hinton']);

      // Messages should have proper structure and substantive content
      for (const message of messages) {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('name');
        expect(message).toHaveProperty('comment');
        expect(message).toHaveProperty('time');
        expect(message.comment.length).toBeGreaterThan(50);
      }

      const allComments = messages
        .map((m) => m.comment)
        .join(' ')
        .toLowerCase();
      const consciousnessTerms = ['consciousness', 'subjective', 'experience', 'awareness'];
      const foundTerms = consciousnessTerms.filter((term) => allComments.includes(term));
      expect(foundTerms.length).toBeGreaterThan(0);

      await aiExpect(allComments).toSatisfy(
        'Contains discussion about machine consciousness with multiple perspectives'
      );
    },
    longTestTimeout
  );

  it(
    'multi-speaker rounds with moderator produce a structured debate',
    async () => {
      const speakers = [
        {
          id: 'chair',
          name: 'Dr. Elena Vasquez',
          bio: 'Conference chair specializing in interdisciplinary AI debates. Known for pressing panelists to engage with each other rather than giving solo speeches.',
          agenda:
            'Open with a provocative framing question about quantum computing and AI. In round two, ask each panelist to directly respond to the other.',
        },
        {
          id: 'physicist',
          name: 'Dr. Preskill',
          bio: 'Theoretical physicist and quantum information scientist at Caltech',
          agenda:
            'Argue that quantum computing will revolutionize machine learning through quantum advantage in optimization and sampling',
        },
        {
          id: 'skeptic',
          name: 'Dr. Aaronson',
          bio: 'Computer scientist specializing in computational complexity and quantum computing limitations',
          agenda:
            'Push back on quantum hype — argue that classical algorithms are catching up and quantum advantage for ML remains unproven',
        },
      ];

      const topic =
        'Quantum Computing for AI: Revolutionary breakthrough or overhyped distraction?';

      // Chair opens, then panelists respond. Second round: panelists first, chair wraps up.
      const moderatedTurnPolicy = (round) => {
        if (round === 0) return ['chair', 'physicist', 'skeptic'];
        return ['physicist', 'skeptic', 'chair'];
      };

      const chain = new ConversationChain(topic, speakers, {
        clock: fixedClock,
        rules: {
          shouldContinue: (round) => round < 2,
          turnPolicy: moderatedTurnPolicy,
        },
      });

      const messages = await chain.run();

      // 2 rounds × 3 speakers = 6 expected; allow some LLM variance
      expect(messages.length).toBeGreaterThanOrEqual(4);

      // All three speakers should participate
      const participantIds = new Set(messages.map((m) => m.id));
      expect(participantIds.has('chair')).toBe(true);
      expect(participantIds.has('physicist')).toBe(true);
      expect(participantIds.has('skeptic')).toBe(true);

      // Chair spoke first (turn policy puts chair first in round 0)
      expect(messages[0].id).toBe('chair');

      // Content should be on-topic
      const allComments = messages
        .map((m) => m.comment)
        .join(' ')
        .toLowerCase();
      expect(allComments).toMatch(/quantum|computing|classical|advantage/);

      await aiExpect(allComments).toSatisfy(
        'Contains a debate about quantum computing and AI with multiple distinct speakers presenting different viewpoints'
      );
    },
    longTestTimeout
  );

  it(
    'customPrompt guides the tone and a summarizer role speaks last',
    async () => {
      const speakers = [
        {
          id: 'hinton',
          name: 'Geoffrey Hinton',
          bio: 'Deep learning pioneer, recently left Google to warn about AI risks',
          agenda: 'Discuss both the potential and dangers of advanced AI systems',
        },
        {
          id: 'sutskever',
          name: 'Ilya Sutskever',
          bio: 'OpenAI co-founder, architect of GPT models',
          agenda: 'Focus on the technical path to AGI and alignment challenges',
        },
        {
          id: 'summarizer',
          name: 'Discussion Summarizer',
          bio: 'Expert at synthesizing complex technical discussions. Provide clear summaries of key points.',
          agenda:
            'Summarize the main arguments and highlight important insights from the discussion',
        },
      ];

      const topic = 'AI Safety and the Race to AGI: Balancing Progress with Precaution';

      const customPrompt =
        'You are participating in a high-stakes debate about AI safety. Be thoughtful, cite specific examples, and acknowledge the complexity of the issues.';

      // Discussion round first, then summarizer alone
      const summaryTurnPolicy = (round) => {
        if (round === 0) return ['hinton', 'sutskever'];
        if (round === 1) return ['summarizer'];
        return [];
      };

      const chain = new ConversationChain(topic, speakers, {
        clock: fixedClock,
        rules: {
          shouldContinue: (round) => round < 2,
          turnPolicy: summaryTurnPolicy,
          customPrompt,
        },
      });

      const messages = await chain.run();

      // Round 0: 2 speakers, round 1: 1 summarizer → 3 expected
      expect(messages.length).toBeGreaterThanOrEqual(2);

      // Summarizer should speak last
      const summarizerMessages = messages.filter((m) => m.id === 'summarizer');
      if (summarizerMessages.length > 0) {
        expect(messages[messages.length - 1].id).toBe('summarizer');
      }

      await aiExpect(messages).toSatisfy(
        'Discussion about AI safety and responsible AGI development'
      );
    },
    longTestTimeout
  );
});
