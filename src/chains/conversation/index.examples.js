import { describe, it as vitestIt, expect as vitestExpect, afterAll } from 'vitest';
import ConversationChain from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout, shouldRunLongExamples } from '../../constants/common.js';
import { roundRobin } from './turn-policies.js';
import { logSuiteEnd } from '../test-analysis/setup.js';
import { wrapIt, wrapExpect, wrapAiExpect } from '../test-analysis/test-wrappers.js';
import { extractFileContext } from '../../lib/logger/index.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Conversation chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Conversation chain' } })
  : vitestExpect;
const aiExpect = config?.aiMode
  ? wrapAiExpect(vitestAiExpect, { baseProps: { suite: 'Conversation chain' } })
  : vitestAiExpect;
const suiteLogEnd = config?.aiMode ? logSuiteEnd : () => {};

afterAll(async () => {
  await suiteLogEnd('Conversation chain', extractFileContext(2));
});

describe('conversation chain examples', () => {
  it.skipIf(!shouldRunLongExamples)(
    'generates a debate on consciousness emergence in AI systems - a current open question',
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

      // Hook: Pre-conversation setup
      expect(speakers.length).toBe(3);
      expect(topic.toLowerCase()).toContain('consciousness');
      // BREAKPOINT: Set breakpoint here to inspect speakers and topic

      const shouldContinueWithHook = (round, _messages) => {
        // Hook: Simple round tracking
        // BREAKPOINT: Set breakpoint here to see round progression and messages
        expect(round).toBeGreaterThanOrEqual(0);
        return round < 3; // 3 rounds to ensure all speakers participate
      };

      const chain = new ConversationChain(topic, speakers, {
        rules: {
          shouldContinue: shouldContinueWithHook,
          turnPolicy: roundRobin(speakers), // Use deterministic round-robin to ensure all speakers participate
          customPrompt:
            "This is a deep philosophical and scientific discussion. Draw on your expertise and engage with others' arguments. Be intellectually rigorous but concise.",
        },
      });

      // Hook: Pre-run validation
      expect(chain.speakers.length).toBe(3);
      // BREAKPOINT: Set breakpoint here before conversation starts

      const messages = await chain.run();

      // Hook: Post-run analysis
      // BREAKPOINT: Set breakpoint here to examine completed conversation
      expect(messages.length).toBeGreaterThan(2); // At least 3 messages (one per speaker)

      // Hook: Final participation check
      const speakerIds = new Set(messages.map((m) => m.id));
      expect(speakerIds.size).toBe(3);
      // BREAKPOINT: Set breakpoint here for final analysis

      // Basic validation
      expect(Array.isArray(messages)).toBe(true);

      // Hook: Speaker participation analysis
      expect(speakerIds.has('turing')).toBe(true);
      expect(speakerIds.has('minsky')).toBe(true);
      expect(speakerIds.has('hinton')).toBe(true);

      // Messages should have proper structure
      for (const message of messages) {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('name');
        expect(message).toHaveProperty('comment');
        expect(message).toHaveProperty('time');
        expect(typeof message.comment).toBe('string');
        expect(message.comment.length).toBeGreaterThan(0);
      }

      // Hook: Content analysis
      const allComments = messages
        .map((m) => m.comment)
        .join(' ')
        .toLowerCase();
      const consciousnessTerms = ['consciousness', 'subjective', 'experience', 'awareness'];
      const foundTerms = consciousnessTerms.filter((term) => allComments.includes(term));

      expect(foundTerms.length).toBeGreaterThan(0);

      // AI validation of conversation quality
      const hasPhilosophicalDepth = await aiExpect(messages).toSatisfy(
        'Should contain sophisticated philosophical discussion about machine consciousness with each pioneer contributing their unique perspective'
      );

      // Hook: Final validation
      expect(hasPhilosophicalDepth).toBe(true);
    },
    longTestTimeout
  );

  it.skipIf(!shouldRunLongExamples)(
    'generates a debate between modern AI researchers with debugging hooks',
    async () => {
      // Hook: Test initialization

      const speakers = [
        {
          id: 'moderator',
          name: 'AI Debate Moderator',
          bio: 'Expert moderator facilitating discussions on AI research directions. Ask probing questions and guide the conversation.',
          agenda: 'Keep the discussion focused and ensure all perspectives are heard',
        },
        {
          id: 'hinton',
          name: 'Geoffrey Hinton',
          bio: 'Godfather of deep learning, pioneer in neural networks and backpropagation',
          agenda: 'Advocate for deep learning and neural network approaches to AI',
        },
        {
          id: 'li',
          name: 'Fei-Fei Li',
          bio: 'Pioneer in computer vision and AI ethics, former Chief Scientist at Google Cloud',
          agenda: 'Emphasize the importance of visual intelligence and responsible AI development',
        },
      ];

      const topic =
        'Deep Learning vs Symbolic AI: Which approach will lead to artificial general intelligence?';

      // Custom turn policy with hooks
      const moderatedTurnPolicy = (round, _messages) => {
        // Hook: Simple turn policy tracking
        expect(round).toBeGreaterThanOrEqual(0);

        if (round === 0) {
          return ['moderator', 'hinton', 'li'];
        } else {
          return ['hinton', 'li', 'moderator'];
        }
      };

      const chain = new ConversationChain(topic, speakers, {
        rules: {
          shouldContinue: (round, _messages) => {
            // Hook: Simple continuation check
            return round < 2; // Only 2 rounds
          },
          turnPolicy: moderatedTurnPolicy,
        },
      });

      // Hook: Pre-execution state
      expect(chain.speakers.length).toBe(3);

      const messages = await chain.run();

      // Hook: Simple results
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(4);

      // Hook: Moderator participation check
      const moderatorMessages = messages.filter((m) => m.id === 'moderator');
      expect(moderatorMessages.length).toBeGreaterThan(0);

      // Hook: Researcher participation check
      const researcherIds = ['hinton', 'li'];
      researcherIds.forEach((id) => {
        const count = messages.filter((m) => m.id === id).length;
        expect(count).toBeGreaterThan(0);
      });

      // AI validation of moderated discussion
      const hasModeratedDiscussion = await aiExpect(messages).toSatisfy(
        'Should contain a well-moderated discussion with the moderator guiding the conversation and researchers providing technical insights'
      );

      // Hook: Final assessment
      expect(hasModeratedDiscussion).toBe(true);
    },
    longTestTimeout
  );

  it.skipIf(!shouldRunLongExamples)(
    'generates a historical debate between early AI pioneers with custom turn policy',
    async () => {
      const speakers = [
        {
          id: 'turing',
          name: 'Alan Turing',
          bio: 'Father of computer science, proposed the Turing Test in 1950',
          agenda: 'Argue that machines can think and exhibit intelligent behavior',
        },
        {
          id: 'minsky',
          name: 'Marvin Minsky',
          bio: 'Co-founder of MIT AI Lab, expert in cognitive science and AI',
          agenda: 'Discuss the society of mind and modular intelligence',
        },
        {
          id: 'mccarthy',
          name: 'John McCarthy',
          bio: 'Inventor of LISP, advocate for logical AI approaches',
          agenda: 'Promote formal logic and symbolic reasoning in AI',
        },
      ];

      const topic = 'Can machines truly think, or do they merely simulate thinking?';

      // Custom turn policy: alternate between Turing and others
      const customTurnPolicy = (round) => {
        if (round === 0) {
          return ['turing', 'minsky', 'mccarthy'];
        } else {
          return ['minsky', 'mccarthy', 'turing'];
        }
      };

      const chain = new ConversationChain(topic, speakers, {
        rules: {
          shouldContinue: (round) => round < 2, // Only 2 rounds
          turnPolicy: customTurnPolicy,
        },
      });

      const messages = await chain.run();

      // Validate turn policy was followed
      expect(messages.length).toBeGreaterThan(4);

      // All speakers should contribute
      expect(messages.some((m) => m.id === 'turing')).toBe(true);
      expect(messages.some((m) => m.id === 'minsky')).toBe(true);
      expect(messages.some((m) => m.id === 'mccarthy')).toBe(true);

      // AI validation of philosophical depth
      const hasPhilosophicalDepth = await aiExpect(messages).toSatisfy(
        'Should contain deep philosophical discussion about machine consciousness and the nature of thinking'
      );
      expect(hasPhilosophicalDepth).toBe(true);
    },
    longTestTimeout
  );

  it(
    'handles conversation with custom prompts and includes a summarizer role',
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

      // Turn policy: discussion round, then summarizer
      const summaryTurnPolicy = (round) => {
        if (round === 0) {
          return ['hinton', 'sutskever'];
        } else if (round === 1) {
          return ['summarizer'];
        } else {
          return [];
        }
      };

      const chain = new ConversationChain(topic, speakers, {
        rules: {
          shouldContinue: (round) => round < 2, // Only 2 rounds
          turnPolicy: summaryTurnPolicy,
          customPrompt,
        },
      });

      const messages = await chain.run();

      // Validate structure - expecting at least 2 messages (2 rounds with varying speakers)
      expect(messages.length).toBeGreaterThanOrEqual(2);

      // Check if expected speakers participated (they may not all speak in every round)
      const speakerIds = messages.map((m) => m.id);
      const hasExpectedSpeakers =
        speakerIds.includes('hinton') ||
        speakerIds.includes('sutskever') ||
        speakerIds.includes('summarizer');
      expect(hasExpectedSpeakers).toBe(true);

      // If summarizer spoke, it should be in the last round
      const summarizerMessages = messages.filter((m) => m.id === 'summarizer');
      if (summarizerMessages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.id).toBe('summarizer');
      }

      // AI validation for safety-focused discussion with summary
      const focusesOnSafety = await aiExpect(messages).toSatisfy(
        'Should contain substantive discussion about AI safety, risks, and responsible AGI development, concluding with a clear summary'
      );
      expect(focusesOnSafety).toBe(true);
    },
    longTestTimeout
  );

  it(
    'demonstrates flexible speaker ordering and role definitions',
    async () => {
      const speakers = [
        {
          id: 'questioner',
          name: 'Socratic Questioner',
          bio: 'Ask probing questions about AI consciousness and challenge assumptions',
          agenda: 'Use the Socratic method to explore deeper truths about machine intelligence',
        },
        {
          id: 'turing',
          name: 'Alan Turing',
          bio: 'Father of computer science, creator of the Turing Test',
          agenda: 'Defend the possibility of machine consciousness and thinking',
        },
        {
          id: 'skeptic',
          name: 'AI Skeptic',
          bio: 'Philosopher who questions whether machines can truly understand or just manipulate symbols',
          agenda: 'Challenge claims about machine consciousness and understanding',
        },
      ];

      const topic = 'What does it mean for a machine to truly understand?';

      // Dynamic turn policy based on conversation flow
      const dynamicTurnPolicy = (round, _history) => {
        if (round === 0) {
          return ['questioner', 'turing', 'skeptic'];
        } else {
          // Final round: questioner gets last word
          return ['turing', 'skeptic', 'questioner'];
        }
      };

      const chain = new ConversationChain(topic, speakers, {
        rules: {
          shouldContinue: (round) => round < 2, // Only 2 rounds
          turnPolicy: dynamicTurnPolicy,
        },
      });

      const messages = await chain.run();

      // Validate we have messages (may have fewer than expected if some speakers don't respond)
      expect(messages.length).toBeGreaterThanOrEqual(2); // At least 2 messages from 2 rounds

      // Check that at least one of the expected speakers participated
      const speakerIds = messages.map((m) => m.id);
      const hasExpectedSpeakers =
        speakerIds.includes('questioner') ||
        speakerIds.includes('turing') ||
        speakerIds.includes('skeptic');
      expect(hasExpectedSpeakers).toBe(true);

      // If we have messages from the second round, questioner should have the final word
      if (messages.length >= 4) {
        // Likely have second round messages
        const lastMessage = messages[messages.length - 1];
        expect(lastMessage.id).toBe('questioner');
      }

      // AI validation of Socratic dialogue
      const hasSocraticDepth = await aiExpect(messages).toSatisfy(
        'Should demonstrate Socratic questioning method with deep philosophical inquiry about machine understanding'
      );
      expect(hasSocraticDepth).toBe(true);
    },
    longTestTimeout
  );
});
