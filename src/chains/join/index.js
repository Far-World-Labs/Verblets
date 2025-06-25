import chatGPT from '../../lib/chatgpt/index.js';
import wrapVariable from '../../prompts/wrap-variable.js';

function buildGroupPrompt(list) {
  const listBlock = wrapVariable(list.join('\n'), { tag: 'list' });
  return [
    'Group contiguous items in <list> that belong together.',
    `Return a JSON object {"labels": [numbers]} with ${list.length} entries.`,
    listBlock,
  ].join('\n');
}

function parseLabels(output, length) {
  let labels;
  if (typeof output === 'string') {
    try {
      const parsed = JSON.parse(output);
      labels = parsed.labels || parsed;
    } catch {
      labels = output
        .split(/\n|,/)
        .map((l) => l.trim())
        .filter(Boolean);
    }
  } else {
    labels = output.labels || output;
  }
  if (!Array.isArray(labels) || labels.length !== length) return null;
  return labels;
}

export default async function join(list, joinStr = '', prompt, config = {}) {
  const { llm, ...options } = config;
  const result = await chatGPT(buildGroupPrompt(list), { modelOptions: { ...llm }, ...options });
  const labels = parseLabels(result, list.length);
  if (!labels) {
    return [list.join(joinStr)];
  }

  const groups = [];
  let current = labels[0];
  let segment = [];
  for (let i = 0; i < list.length; i += 1) {
    if (labels[i] !== current) {
      // finalize previous segment
      // eslint-disable-next-line no-await-in-loop
      const fused = prompt ? await prompt(segment) : segment.join(joinStr);
      groups.push(fused);
      segment = [];
      current = labels[i];
    }
    segment.push(list[i]);
  }
  if (segment.length) {
    // eslint-disable-next-line no-await-in-loop
    const fused = prompt ? await prompt(segment) : segment.join(joinStr);
    groups.push(fused);
  }
  return groups;
}
