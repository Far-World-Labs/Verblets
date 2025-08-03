/**
 * Global teardown for all test suites
 * This runs once after all test files complete
 */

import { withConfigCheck } from './lib/common/config.js';
import { cleanupState } from './lib/common/state.js';

export default withConfigCheck(async () => cleanupState());