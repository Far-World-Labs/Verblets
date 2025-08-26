/**
 * Analysis Start View
 * Displays the initial module analysis header
 */

import { bold, cyan } from '../output-utils.js';
import { basename } from 'node:path';

export function renderAnalysisStart(moduleDir) {
  const moduleName = basename(moduleDir);
  const output = `
${bold(cyan('MODULE ANALYSIS STARTING'))}
      Analyzing: ${moduleName}
`;
  return output;
}
