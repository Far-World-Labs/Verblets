/**
 * Normalize the llm config parameter into a consistent object form.
 *
 * Users can pass llm as:
 *   - a model name string:  'gpt-4.1-mini'    → { modelName: 'gpt-4.1-mini' }
 *   - capability flags:     { fast: true }    → passed through (callLlm extracts them)
 *   - a full config object: { modelName, … }  → passed through
 *   - undefined/null                           → undefined
 *
 * @param {string|Object|undefined|null} llm
 * @returns {Object|undefined}
 */
export default function normalizeLlm(llm) {
  if (llm == null) return undefined;
  if (typeof llm === 'string') return { modelName: llm };
  return llm;
}
