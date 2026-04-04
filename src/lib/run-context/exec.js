/**
 * Automation-to-automation execution surface.
 *
 * ctx.lib.scripts.exec is exclusively for automation composition.
 * Automations that need to run chains or verblets directly
 * do so via ctx.lib.verblets.
 *
 * Resolves child automations via the XDG-backed registry.
 */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolve as resolveAutomation } from '../automation-registry/index.js';

export default function createExec(options = {}) {
  const { buildChildContext } = options;

  return {
    /**
     * Invoke another automation by name.
     *
     * @param {string} name - Automation name (as registered)
     * @param {object} [params={}] - Invocation parameters
     * @returns {Promise<any>} Automation result
     */
    async automation(name, params = {}) {
      const automationDir = await resolveAutomation(name);
      if (!automationDir) {
        throw new Error(
          `Automation '${name}' is not registered. Use automation-registry.register() first.`
        );
      }

      const indexPath = resolve(automationDir, 'index.js');
      const automationUrl = pathToFileURL(indexPath).href;
      const automationModule = await import(automationUrl);

      const exportedRun = automationModule.run || automationModule.default?.run;
      const exportedMeta = automationModule.meta || automationModule.default?.meta;

      if (typeof exportedRun !== 'function') {
        throw new Error(`Automation '${name}' does not export a run function`);
      }

      const childCtx = buildChildContext(exportedMeta?.name || name, automationDir);
      const result = await exportedRun(childCtx, params);
      return result;
    },
  };
}
