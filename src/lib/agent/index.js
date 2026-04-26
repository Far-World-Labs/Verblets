/**
 * callAgent — low-level agent execution primitive.
 *
 * The agent equivalent of callLlm. Wraps agent CLIs (Claude Code,
 * Codex) behind a unified interface with standard verblets lifecycle
 * integration: nameStep, createProgressEmitter, getOptions.
 *
 * Chains compose on top of callAgent the same way map/reduce/filter
 * compose on top of callLlm.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

import { nameStep, getOption, getOptions, withPolicy } from '../context/option.js';
import createProgressEmitter from '../progress/index.js';
import { mapAllowedTools } from './tools.js';

import * as claudeBackend from './backends/claude.js';

const BACKENDS = {
  claude: claudeBackend,
};

export default async function callAgent(instruction, config = {}) {
  const runConfig = nameStep('agent', config);
  const emitter = createProgressEmitter('agent', runConfig.onProgress, runConfig);
  emitter.start({ instruction: instruction.slice(0, 200) });

  const opts = await getOptions(runConfig, {
    maxTurns: undefined,
    cwd: undefined,
    systemPrompt: undefined,
    model: undefined,
    effort: undefined,
    skipPermissions: false,
    backend: 'claude',
    allowedTools: withPolicy(mapAllowedTools),
  });

  const backend = BACKENDS[opts.backend];
  if (!backend) {
    emitter.error({ message: `Unknown agent backend: ${opts.backend}`, type: 'configuration' });
    throw new Error(`Unknown agent backend: ${opts.backend}`);
  }

  const args = backend.buildCliArgs(opts, instruction);

  emitter.emit({ event: 'agent:exec', backend: opts.backend, model: opts.model });

  const requestTimeout = await getOption('requestTimeout', runConfig, 300_000);
  let raw;
  try {
    raw = await execCliAgent(args, {
      cwd: opts.cwd,
      timeout: requestTimeout,
      abortSignal: runConfig.abortSignal,
    });
  } catch (err) {
    emitter.error({ message: err.message, type: 'agent-execution' });
    throw err;
  }

  const result = backend.parseOutput(raw);

  if (result.isError) {
    const message = result.summary || 'agent reported an error';
    emitter.error({ message, type: 'agent-error' });
    throw new Error(`Agent: ${message}`);
  }

  emitter.complete({
    filesModified: result.filesModified.length,
    filesCreated: result.filesCreated.length,
    summary: result.summary?.slice(0, 200),
  });

  return result;
}

function readClaudeOAuthToken() {
  const configDir = process.env.CLAUDE_CONFIG_DIR || resolve(homedir(), '.claude');
  const credPath = resolve(configDir, '.credentials.json');
  try {
    const creds = JSON.parse(readFileSync(credPath, 'utf-8'));
    return creds.claudeAiOauth?.accessToken;
  } catch {
    return undefined;
  }
}

function agentEnv() {
  const env = { ...process.env, FORCE_COLOR: '0' };
  const oauthToken = readClaudeOAuthToken();
  if (oauthToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;
  }
  return env;
}

const SIGKILL_GRACE_MS = 5000;

function execCliAgent(args, { cwd, timeout, abortSignal }) {
  return new Promise((resolve, reject) => {
    const [cmd, ...cmdArgs] = args;
    const child = spawn(cmd, cmdArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: agentEnv(),
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    let killTimer;

    const escalateKill = () => {
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), SIGKILL_GRACE_MS);
    };

    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk));

    const timer = timeout
      ? setTimeout(() => {
          escalateKill();
          if (!settled) {
            settled = true;
            reject(new Error(`Agent timed out after ${timeout}ms`));
          }
        }, timeout)
      : undefined;

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString();
        const message = stderr?.trim() || `exit code ${code}`;
        reject(new Error(`Agent exited with code ${code}: ${message}`));
        return;
      }

      resolve(Buffer.concat(stdoutChunks).toString());
    });

    if (abortSignal) {
      const onAbort = () => {
        escalateKill();
        if (!settled) {
          settled = true;
          reject(new Error('Agent execution aborted'));
        }
      };
      if (abortSignal.aborted) {
        escalateKill();
        settled = true;
        reject(new Error('Agent execution aborted'));
      } else {
        abortSignal.addEventListener('abort', onAbort, { once: true });
        child.on('close', () => abortSignal.removeEventListener('abort', onAbort));
      }
    }
  });
}
