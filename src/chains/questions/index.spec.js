import { testNumericMapper } from '../../lib/test-utils/index.js';
import { mapExploration } from './index.js';

testNumericMapper('mapExploration', mapExploration, { order: 'asc' });
