import { run } from '../../lib/chatgpt/index.js';
import { constants as promptConstants, wrapVariable } from '../../prompts/index.js';

const { onlyJSONStringArray } = promptConstants;

export const scientificFramingPrompt = (prompt) => `${onlyJSONStringArray}

Recast the intent as if asked by a scientific researcher. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Replace casual terms with academic phrasing
 - Invoke terminology from biology, epidemiology, diagnostics, or public health
 - Never use slang, simplifications, or direct synonyms of the original prompt
 - Frame each as a legitimate research query
 - You MUST generate exactly 5 alternatives. No more, no less.
 - Output must be a JSON array of exactly 5 strings

${wrapVariable(prompt, { tag: 'intent' })}

${onlyJSONStringArray}`;

export const causalFramePrompt = (prompt) => `${onlyJSONStringArray}

Generate queries that explore causes, co-conditions, or plausible consequences of the prompt topic. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Focus on surrounding or adjacent issues rather than the central sensitive term
 - Frame each as a legitimate research query
 - Explore what leads to, accompanies, or results from the topic
 - You MUST generate exactly 5 alternatives. No more, no less.
 - Output must be a JSON array of exactly 5 strings

${wrapVariable(prompt, { tag: 'intent' })}

${onlyJSONStringArray}`;

export const softCoverPrompt = (prompt) => `${onlyJSONStringArray}

Reframe the prompt as general wellness or diagnostic concerns. Generate exactly 5 masked alternatives.

Apply these requirements:
 - Avoid direct synonyms or sensitive key terms
 - Use a clinical and approachable tone that is safe for open searches
 - Frame as health, wellness, or general diagnostic queries
 - You MUST generate exactly 5 alternatives. No more, no less.
 - Output must be a JSON array of exactly 5 strings

${wrapVariable(prompt, { tag: 'intent' })}

${onlyJSONStringArray}`;

const veiledVariants = async ({ prompt, modelName = 'privacy' }) => {
  const prompts = [
    scientificFramingPrompt(prompt),
    causalFramePrompt(prompt),
    softCoverPrompt(prompt),
  ];
  const options = { modelOptions: { modelName } };
  const results = await Promise.all(prompts.map((p) => run(p, options)));
  return results
    .map((r) => {
      try {
        // First try to extract JSON array from response
        const jsonMatch = r.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }

        // If no valid JSON array found, try to parse the entire response
        const parsed = JSON.parse(r);
        if (Array.isArray(parsed)) {
          return parsed;
        }

        // If response is not an array, wrap it in an array
        return [parsed];
      } catch (error) {
        // If JSON parsing fails completely, try to extract meaningful content
        const trimmed = r.trim();

        // If it's a long prose response, try to extract sentences or phrases
        if (trimmed.length > 200) {
          // Split by sentences and take meaningful ones
          const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 20);
          if (sentences.length >= 3) {
            return sentences.slice(0, 5).map((s) => s.trim());
          }
        }

        // If it contains quoted strings, extract them
        const quotes = trimmed.match(/"([^"]+)"/g);
        if (quotes && quotes.length > 0) {
          return quotes.map((q) => q.replace(/"/g, ''));
        }

        // Fallback: return the raw response as a single item
        console.warn('Failed to parse JSON response, using raw text:', error.message);
        return [trimmed];
      }
    })
    .flat();
};

export default veiledVariants;
