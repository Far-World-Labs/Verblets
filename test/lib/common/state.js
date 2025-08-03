/**
 * Common state file management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function createStateDir() {
  const testStateDir = join(tmpdir(), 'verblets-test-' + process.pid);
  mkdirSync(testStateDir, { recursive: true });
  return testStateDir;
}

export function createStateFile(stateDir) {
  const stateFile = join(stateDir, 'test-state.json');
  writeFileSync(stateFile, JSON.stringify({
    pid: process.pid,
    startTime: Date.now(),
    stateDir,
  }));
  return stateFile;
}

export function setStateFileEnv(stateFile) {
  process.env.VERBLETS_TEST_STATE_FILE = stateFile;
}

export function getStateFile() {
  return process.env.VERBLETS_TEST_STATE_FILE;
}

export function readState() {
  const stateFile = getStateFile();
  if (!stateFile || !existsSync(stateFile)) {
    return null;
  }
  return JSON.parse(readFileSync(stateFile, 'utf8'));
}

export function cleanupState() {
  const state = readState();
  if (!state) return;
  
  const { stateDir } = state;
  if (existsSync(stateDir)) {
    rmSync(stateDir, { recursive: true, force: true });
  }
}