import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import SocraticMethod from './index.js';
import vitestAiExpect from '../expect/index.js';
import { longTestTimeout } from '../../constants/common.js';
import {
  makeWrappedIt,
  makeWrappedExpect,
  makeWrappedAiExpect,
} from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const suite = 'Socratic chain';

const it = makeWrappedIt(vitestIt, suite, config);
const expect = makeWrappedExpect(vitestExpect, suite, config);
const aiExpect = makeWrappedAiExpect(vitestAiExpect, suite, config);

// Higher-order function to create test-specific loggers
const makeTestLogger = (testName) => {
  return config?.aiMode && globalThis.logger
    ? globalThis.logger.child({ suite, testName })
    : undefined;
};

describe('Socratic method chain', () => {
  it(
    'explores a simple concept through questioning',
    async () => {
      const statement = 'Knowledge is power';
      const socratic = new SocraticMethod(statement, {
        logger: makeTestLogger('explores a simple concept through questioning'),
      });

      // Take a single step
      const turn = await socratic.step();

      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');
      expect(typeof turn.question).toBe('string');
      expect(typeof turn.answer).toBe('string');
      expect(turn.question.length).toBeGreaterThan(0);
      expect(turn.answer.length).toBeGreaterThan(0);

      // Check the dialogue was recorded
      const dialogue = socratic.getDialogue();
      expect(dialogue).toHaveLength(1);
      expect(dialogue[0]).toBe(turn);

      // AI validation of Socratic questioning
      const isSocratic = await aiExpect(turn.question).toSatisfy(
        'Should be a Socratic question that challenges assumptions about "knowledge is power"'
      );
      expect(isSocratic).toBe(true);
    },
    longTestTimeout
  );

  it(
    'maintains dialogue history across multiple steps',
    async () => {
      const statement = 'Success is measured by wealth';
      const socratic = new SocraticMethod(statement, {
        logger: makeTestLogger('maintains dialogue history across multiple steps'),
      });

      // Take multiple steps
      const turn1 = await socratic.step();
      const turn2 = await socratic.step();

      // Check dialogue progression
      const dialogue = socratic.getDialogue();
      expect(dialogue).toHaveLength(2);
      expect(dialogue[0]).toBe(turn1);
      expect(dialogue[1]).toBe(turn2);

      // Verify second question builds on first
      const progressesLogically = await aiExpect(dialogue).toSatisfy(
        'The second question should build upon or relate to the first question and answer, showing logical progression in the Socratic dialogue'
      );
      expect(progressesLogically).toBe(true);
    },
    longTestTimeout
  );

  it(
    'allows custom ask and answer functions',
    async () => {
      let askCalled = false;
      let answerCalled = false;

      const customAsk = async ({ topic, history }) => {
        askCalled = true;
        expect(topic).toBe('Custom topic');
        expect(Array.isArray(history)).toBe(true);
        return 'What assumptions underlie this belief?';
      };

      const customAnswer = async ({ question, history, topic: _topic }) => {
        answerCalled = true;
        expect(typeof question).toBe('string');
        expect(Array.isArray(history)).toBe(true);
        return 'The assumptions include that belief shapes reality.';
      };

      const socratic = new SocraticMethod('Custom topic', {
        ask: customAsk,
        answer: customAnswer,
        logger: makeTestLogger('allows custom ask and answer functions'),
      });

      const turn = await socratic.step();

      expect(askCalled).toBe(true);
      expect(answerCalled).toBe(true);
      expect(turn.question).toBe('What assumptions underlie this belief?');
      expect(turn.answer).toContain('assumptions');
    },
    longTestTimeout
  );

  it(
    'explores complex philosophical topic through dialogue',
    async () => {
      const statement = 'Free will is an illusion created by consciousness';
      const socratic = new SocraticMethod(statement, {
        logger: makeTestLogger('explores complex philosophical topic through dialogue'),
      });

      // Build a dialogue with 3 rounds
      const dialogue = [];
      for (let i = 0; i < 3; i++) {
        const turn = await socratic.step();
        dialogue.push(turn);
      }

      expect(dialogue).toHaveLength(3);

      // Each turn should have valid Q&A
      dialogue.forEach((turn) => {
        expect(turn.question).toBeTruthy();
        expect(turn.answer).toBeTruthy();
      });

      // AI validation of philosophical depth
      const hasPhilosophicalDepth = await aiExpect(dialogue).toSatisfy(
        'Should demonstrate deep philosophical inquiry about free will through Socratic questioning, with each question probing deeper into the nature of consciousness and determinism'
      );
      expect(hasPhilosophicalDepth).toBe(true);
    },
    longTestTimeout
  );
});
