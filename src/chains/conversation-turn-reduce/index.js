import map from '../map/index.js';
import createProgressEmitter, { scopePhase } from '../../lib/progress/index.js';
import { nameStep } from '../../lib/context/option.js';

const name = 'conversation-turn-reduce';

/**
 * Generate conversation responses for multiple speakers.
 * Each speaker sees and can respond to previous speakers' responses in this round.
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.speakers - Array of speaker objects with id, name, bio, agenda
 * @param {string} options.topic - The conversation topic
 * @param {Array} options.history - Array of previous messages
 * @param {Object} options.rules - Conversation rules including customPrompt
 * @param {string|Object} options.llm - LLM configuration (resolved by callLlm)
 * @returns {Promise<Array<string>>} Array of responses, one per speaker
 */
export default async function conversationTurnReduce({
  speakers,
  topic,
  history = [],
  rules = {},
  ...options
}) {
  if (!speakers || speakers.length === 0) {
    throw new Error('At least one speaker is required');
  }

  if (!topic) {
    throw new Error('Topic is required');
  }

  const runConfig = nameStep(name, options);
  const emitter = createProgressEmitter(name, runConfig.onProgress, runConfig);
  emitter.start();

  try {
    // Build initial context
    const historySnippet =
      history.length > 0
        ? history.map((m) => `${m.time} ${m.name} (${m.id}): ${m.comment}`).join('\n')
        : '';

    const customPrompt = rules.customPrompt || '';
    const baseContext = [
      customPrompt,
      historySnippet ? `Previous conversation:\n${historySnippet}` : '',
      `Topic: "${topic}"`,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Create speaker descriptions as strings for map
    const speakerDescriptions = speakers.map((speaker, index) => {
      const speakerName = speaker.name || `Speaker ${index + 1}`;
      const parts = [speakerName];
      if (speaker.bio) parts.push(`Bio: ${speaker.bio}`);
      if (speaker.agenda) parts.push(`Agenda: ${speaker.agenda}`);
      return parts.join('\n');
    });

    // Instructions for transforming speaker descriptions into responses
    const instructions = `Given a speaker description, generate their response to the conversation.

${baseContext}

For the speaker described in the input, provide their response to the topic. The response should reflect their role, bio, and agenda if provided.`;

    // Generate all responses using map
    const result = await map(speakerDescriptions, instructions, {
      ...runConfig,
      onProgress: scopePhase(runConfig.onProgress, 'conversation-turn-reduce:map'),
    });

    emitter.complete({ outcome: 'success', speakers: speakers.length });
    return result;
  } catch (err) {
    emitter.error(err);
    throw err;
  }
}
