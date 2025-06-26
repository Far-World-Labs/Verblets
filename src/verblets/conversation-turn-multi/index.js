import chatGPT from '../../lib/chatgpt/index.js';
import modelService from '../../services/llm-model/index.js';

const historySnippet = (history) =>
  history.map((m) => `${m.time} ${m.name} (${m.id}): ${m.comment}`).join('\n');

const speakersBlock = (speakers) => {
  return speakers
    .map((p, i) => {
      const name = p.name || `Speaker ${i + 1}`;
      const parts = [name];
      if (p.bio) parts.push(`- ${p.bio}`);
      if (p.agenda) parts.push(`agenda: ${p.agenda}`);
      return parts.join(' ');
    })
    .join('\n');
};

const BULK_SPEAK_PROMPT =
  '{forOthersToReplace}\n{bios}\n{history}Multiple speakers are responding to "{topic}". Generate responses for each speaker that engage with the discussion and reflect their unique perspectives. Return responses in order:\n\n{speakerNames}';

const buildPrompt = (template, vars) =>
  template
    .replace('{forOthersToReplace}', vars.customPrompt || '')
    .replace('{bios}', vars.bios)
    .replace('{history}', vars.history ? `${vars.history}\n` : '')
    .replace('{topic}', vars.topic)
    .replace('{speakerNames}', vars.speakerNames || '');

/**
 * Generate conversation responses for multiple speakers in a single call
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.speakers - Array of speaker objects with id, name, bio, agenda
 * @param {string} options.topic - The conversation topic
 * @param {Array} options.history - Array of previous messages
 * @param {Object} options.rules - Conversation rules including customPrompt
 * @param {Object} options.model - LLM model to use (defaults to best public model)
 * @returns {Promise<Array<string>>} Array of responses, one per speaker
 */
export default async function conversationTurnMulti({
  speakers,
  topic,
  history = [],
  rules = {},
  model = modelService.getBestPublicModel(),
}) {
  if (!speakers || speakers.length === 0) {
    throw new Error('At least one speaker is required');
  }

  if (!topic) {
    throw new Error('Topic is required');
  }

  const snippet = historySnippet(history);
  const bios = speakersBlock(speakers);
  const speakerNames = speakers
    .map((s, i) => `${i + 1}. ${s.name || `Speaker ${i + 1}`}`)
    .join('\n');

  const prompt = buildPrompt(BULK_SPEAK_PROMPT, {
    customPrompt: rules.customPrompt,
    bios,
    history: snippet,
    topic,
    speakerNames,
  });

  const budget = model.budgetTokens(prompt);
  const response = await chatGPT(prompt, { maxTokens: budget.completion });

  // Parse the response into individual comments
  // Simple parsing: split by numbered lines or speaker names
  const lines = response.split('\n').filter((line) => line.trim());
  const comments = [];
  let currentComment = '';

  for (const line of lines) {
    // Check if line starts with a number (1., 2., etc.) or speaker name
    const isNewSpeaker =
      /^\d+\./.test(line.trim()) || speakers.some((s) => line.includes(s.name || ''));

    if (isNewSpeaker && currentComment) {
      comments.push(currentComment.trim());
      currentComment = line.replace(/^\d+\.\s*/, '').replace(/^[^:]*:\s*/, '');
    } else if (isNewSpeaker) {
      currentComment = line.replace(/^\d+\.\s*/, '').replace(/^[^:]*:\s*/, '');
    } else {
      currentComment += ` ${line}`;
    }
  }

  if (currentComment) {
    comments.push(currentComment.trim());
  }

  // Ensure we have the right number of comments
  while (comments.length < speakers.length) {
    comments.push(`I agree with the previous points made.`);
  }

  return comments.slice(0, speakers.length);
}
