import { bulkMapRetry } from '../bulk-map/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildInstructions(topic, history, speakers, customPrompt = '') {
  const historyBlock = history ? `${wrapVariable(history, { tag: 'history' })}\n` : '';
  const participantsBlock = wrapVariable(speakers.join('\n'), { tag: 'speakers' });
  return (
    `${customPrompt}\n${participantsBlock}\n${historyBlock}` +
    `For each line in <list> identify the speaker and write a short closing statement summarizing their perspective on "${topic}".`
  );
}

export default async function bulkConversationSummary({
  speakers = [],
  topic,
  history = '',
  customPrompt = '',
  chunkSize = 5,
  maxAttempts = 3,
  llm,
} = {}) {
  const lines = speakers.map((s) => `${s.id}${s.name ? ` (${s.name})` : ''}`);
  const instructions = buildInstructions(
    topic,
    history,
    speakers.map((p) => `${p.id}${p.name ? ` (${p.name})` : ''}`),
    customPrompt
  );
  const results = await bulkMapRetry(lines, instructions, { chunkSize, maxAttempts, llm });
  return results.map((r) => (typeof r === 'string' ? r.trim() : ''));
}
