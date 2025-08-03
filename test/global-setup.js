/**
 * Global setup for all test suites
 * This runs once before all test files
 */

import { withConfigCheck } from './lib/common/config.js';
import { createStateDir, createStateFile, setStateFileEnv } from './lib/common/state.js';

export default withConfigCheck(async (config) => {
  const stateDir = createStateDir();
  const stateFile = createStateFile(stateDir);
  setStateFileEnv(stateFile);
  
  return () => {
    setStateFileEnv(stateFile);
  };
});