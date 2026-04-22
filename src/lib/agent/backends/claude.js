/**
 * Claude Code CLI backend for callAgent.
 *
 * Pure functions: buildCliArgs maps verblets config to CLI flags,
 * parseOutput converts CLI stream-json output to the common result shape.
 */

import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';

const TOOL_MAP = {
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  search: 'Grep',
  glob: 'Glob',
  bash: 'Bash',
  git: 'Bash(git status),Bash(git diff),Bash(git log),Bash(git add),Bash(git commit)',
};

function resolveClaudeBinary() {
  const candidates = [
    resolve(homedir(), '.claude/local/node_modules/.bin/claude'),
    resolve(homedir(), '.claude/local/claude'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return 'claude';
}

export function buildCliArgs(opts, instruction) {
  const args = [resolveClaudeBinary(), '--print', '--output-format', 'stream-json', '--verbose'];

  if (opts.bare) {
    // Skip hooks, LSP, plugins, auto-memory — faster non-interactive execution.
    // Auth falls back to ANTHROPIC_API_KEY (OAuth/keychain not read in bare mode).
    args.push('--bare');
    if (opts.cwd) {
      args.push('--add-dir', opts.cwd);
    }
  }

  if (opts.skipPermissions) {
    args.push('--dangerously-skip-permissions');
  }

  if (opts.maxTurns) {
    args.push('--max-turns', String(opts.maxTurns));
  }

  if (opts.systemPrompt) {
    args.push('--system-prompt', opts.systemPrompt);
  }

  if (opts.allowedTools?.length) {
    const mapped = opts.allowedTools.map((t) => TOOL_MAP[t] || t).join(',');
    args.push('--allowedTools', mapped);
  }

  if (opts.model) {
    args.push('--model', opts.model);
  }

  if (opts.effort) {
    args.push('--effort', opts.effort);
  }

  args.push('-p', instruction);

  return args;
}

export function parseOutput(raw) {
  const lines = raw.split('\n').filter(Boolean);
  const messages = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      messages.push(parsed);
    } catch {
      // non-JSON output line
    }
  }

  const assistantMessages = messages.filter((m) => m.type === 'assistant');
  const resultMessage = messages.find((m) => m.type === 'result');

  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const summary = extractSummary(lastAssistant, resultMessage);

  const filesModified = extractFilesModified(messages);
  const filesCreated = extractFilesCreated(messages);

  return {
    summary,
    filesModified,
    filesCreated,
    costUsd: resultMessage?.total_cost_usd,
    numTurns: resultMessage?.num_turns,
    isError: resultMessage?.is_error,
    messages,
    rawOutput: raw.slice(0, 10_000),
  };
}

function extractSummary(assistantMessage, resultMessage) {
  if (resultMessage?.result) return resultMessage.result.slice(0, 2000);
  if (!assistantMessage) return '';
  const content = assistantMessage.message?.content || assistantMessage.content;
  if (typeof content === 'string') return content.slice(0, 2000);
  if (Array.isArray(content)) {
    const textBlocks = content.filter((b) => b.type === 'text');
    return textBlocks
      .map((b) => b.text)
      .join('\n')
      .slice(0, 2000);
  }
  return '';
}

function extractToolUseBlocks(messages) {
  const blocks = [];
  for (const m of messages) {
    if (m.type !== 'assistant') continue;
    const content = m.message?.content || m.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_use') blocks.push(block);
    }
  }
  return blocks;
}

function extractFilesModified(messages) {
  const files = new Set();
  for (const block of extractToolUseBlocks(messages)) {
    if (block.name === 'Edit' || block.name === 'Write') {
      const path = block.input?.file_path;
      if (path) files.add(path);
    }
  }
  return [...files];
}

function extractFilesCreated(messages) {
  const files = new Set();
  for (const block of extractToolUseBlocks(messages)) {
    if (block.name === 'Write') {
      const path = block.input?.file_path;
      if (path) files.add(path);
    }
  }
  return [...files];
}
