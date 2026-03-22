import { describe } from 'vitest';
import SocraticMethod from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import { getTestHelpers } from '../test-analysis/test-wrappers.js';

const { it, expect, aiExpect, makeLogger } = getTestHelpers('Socratic chain');

describe('Socratic method chain', () => {
  it(
    'explores a simple concept through questioning',
    async () => {
      const statement = 'Knowledge is power';
      const socratic = new SocraticMethod(statement, {
        logger: makeLogger('explores a simple concept through questioning'),
      });

      // Take a single step
      const turn = await socratic.step();

      expect(turn).toHaveProperty('question');
      expect(turn).toHaveProperty('answer');

      const dialogue = socratic.getDialogue();
      expect(dialogue).toHaveLength(1);
      expect(dialogue[0]).toBe(turn);

      await aiExpect(turn.question).toSatisfy(
        'Should be a Socratic question that challenges assumptions about "knowledge is power"'
      );
    },
    longTestTimeout
  );

  it(
    'maintains dialogue history across multiple steps',
    async () => {
      const statement = 'Success is measured by wealth';
      const socratic = new SocraticMethod(statement, {
        logger: makeLogger('maintains dialogue history across multiple steps'),
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
      await aiExpect(dialogue).toSatisfy(
        'The second question should build upon or relate to the first question and answer, showing logical progression in the Socratic dialogue'
      );
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
        logger: makeLogger('allows custom ask and answer functions'),
      });

      const turn = await socratic.step();

      expect(askCalled).toBe(true);
      expect(answerCalled).toBe(true);
      expect(turn.question).toBe('What assumptions underlie this belief?');
      expect(turn.answer).toContain('assumptions');
    },
    longTestTimeout
  );
});
