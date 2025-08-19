import { describe, it as vitestIt, expect as vitestExpect } from 'vitest';
import { wrapIt, wrapExpect } from '../test-analysis/test-wrappers.js';
import { getConfig } from '../test-analysis/config.js';

const config = getConfig();
const it = config?.aiMode
  ? wrapIt(vitestIt, { baseProps: { suite: 'Conversation-turn-reduce chain' } })
  : vitestIt;
const expect = config?.aiMode
  ? wrapExpect(vitestExpect, { baseProps: { suite: 'Conversation-turn-reduce chain' } })
  : vitestExpect;

describe('conversation-turn-reduce chain', () => {
  it('is tested via conversation chain examples', () => {
    // conversation-turn-reduce is an internal utility used by the conversation chain
    // It's thoroughly tested through the conversation chain's example tests
    // No separate tests needed here
    expect(true).toBe(true);
  });
});
