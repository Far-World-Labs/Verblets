/**
 * OpenAI Codex CLI backend for callAgent.
 *
 * Stub — implements the same interface as claude.js.
 * Will be filled in when Codex CLI support is added.
 */

export function buildCliArgs(opts, instruction) {
  const args = ['codex'];

  if (opts.model) {
    args.push('--model', opts.model);
  }

  args.push(instruction);

  return args;
}

export function parseOutput(raw) {
  return {
    summary: raw.slice(0, 2000),
    filesModified: [],
    filesCreated: [],
    messages: [],
    rawOutput: raw.slice(0, 10_000),
  };
}
