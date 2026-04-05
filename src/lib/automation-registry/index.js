/**
 * Automation registry — filesystem-backed discovery of registered automations.
 *
 * Registry lives at XDG_CONFIG_HOME/verblets-automations/registry.json.
 * Automations can live anywhere on disk (sibling repos, monorepo subdirs, etc.).
 * The registry stores absolute paths and basic stats.
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const REGISTRY_VERSION = 1;

function registryPath() {
  if (process.env.VERBLETS_REGISTRY_PATH) return process.env.VERBLETS_REGISTRY_PATH;
  const xdgConfig = process.env.XDG_CONFIG_HOME || resolve(homedir(), '.config');
  return resolve(xdgConfig, 'verblets-automations', 'registry.json');
}

async function readRegistry() {
  try {
    const raw = await readFile(registryPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { version: REGISTRY_VERSION, automations: {} };
  }
}

async function writeRegistry(registry) {
  const filePath = registryPath();
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmpPath, JSON.stringify(registry, undefined, 2), 'utf-8');
  await rename(tmpPath, filePath);
}

/**
 * Register an automation by name and absolute path.
 * @param {string} name
 * @param {string} absolutePath - Absolute path to the automation directory (contains index.js)
 */
export async function register(name, absolutePath) {
  const registry = await readRegistry();
  registry.automations[name] = {
    ...registry.automations[name],
    path: absolutePath,
    registeredAt: registry.automations[name]?.registeredAt || new Date().toISOString(),
  };
  await writeRegistry(registry);
}

/**
 * Remove an automation from the registry.
 * @param {string} name
 */
export async function unregister(name) {
  const registry = await readRegistry();
  delete registry.automations[name];
  await writeRegistry(registry);
}

/**
 * List all registered automations.
 * @returns {Promise<Array<{ name: string, path: string, registeredAt: string, lastRun?: string, runCount?: number }>>}
 */
export async function list() {
  const registry = await readRegistry();
  return Object.entries(registry.automations).map(([name, entry]) => ({
    name,
    ...entry,
  }));
}

/**
 * Resolve a registered automation name to its absolute path.
 * @param {string} name
 * @returns {Promise<string|undefined>}
 */
export async function resolve_(name) {
  const registry = await readRegistry();
  return registry.automations[name]?.path;
}

/**
 * Update stats for a registered automation (lastRun, runCount, etc.).
 * @param {string} name
 * @param {object} data - Fields to merge into the entry
 */
export async function updateStats(name, data) {
  const registry = await readRegistry();
  const entry = registry.automations[name];
  if (entry) {
    Object.assign(entry, data);
    await writeRegistry(registry);
  }
}

/**
 * Scan a directory for valid automations (subdirs containing index.js with { meta, run }).
 * @param {string} dirPath - Absolute path to scan
 * @returns {Promise<Array<{ name: string, meta: object, path: string }>>}
 */
export async function discoverFromPath(dirPath) {
  const { readdir } = await import('node:fs/promises');
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const automations = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const automationDir = resolve(dirPath, entry.name);
    const indexPath = resolve(automationDir, 'index.js');
    try {
      const mod = await import(pathToFileURL(indexPath).href);
      const meta = mod.meta || mod.default?.meta;
      const run = mod.run || mod.default?.run;

      if (typeof run !== 'function' || !meta?.name) continue;
      automations.push({ name: meta.name, meta, path: automationDir });
    } catch {
      // Not a valid automation
    }
  }

  return automations;
}

export { resolve_ as resolve };
