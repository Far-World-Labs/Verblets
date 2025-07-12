import map from '../map/index.js';

/**
 * Generate conversation responses for multiple speakers.
 * Each speaker sees and can respond to previous speakers' responses in this round.
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.speakers - Array of speaker objects with id, name, bio, agenda
 * @param {string} options.topic - The conversation topic
 * @param {Array} options.history - Array of previous messages
 * @param {Object} options.rules - Conversation rules including customPrompt
 * @param {Object} options.llm - LLM configuration
 * @returns {Promise<Array<string>>} Array of responses, one per speaker
 */
export default function conversationTurnReduce({
  speakers,
  topic,
  history = [],
  rules = {},
  llm,
  ...options
}) {
  if (!speakers || speakers.length === 0) {
    throw new Error('At least one speaker is required');
  }

  if (!topic) {
    throw new Error('Topic is required');
  }

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
    const name = speaker.name || `Speaker ${index + 1}`;
    const parts = [name];
    if (speaker.bio) parts.push(`Bio: ${speaker.bio}`);
    if (speaker.agenda) parts.push(`Agenda: ${speaker.agenda}`);
    return parts.join('\n');
  });

  // Instructions for transforming speaker descriptions into responses
  const instructions = `Given a speaker description, generate their response to the conversation.

${baseContext}

For the speaker described in the input, provide their response to the topic. The response should reflect their role, bio, and agenda if provided.`;

  // Generate all responses using map
  return map(speakerDescriptions, instructions, {
    llm,
    ...options,
  });
}
