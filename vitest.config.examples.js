import { defineConfig } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';
import { truthyValues, falsyValues } from './src/constants/common.js';

// Check if AI mode should be enabled (matches config.js logic)
const aiLogsOnly = process.env.VERBLETS_AI_LOGS_ONLY && truthyValues.includes(process.env.VERBLETS_AI_LOGS_ONLY);
const aiPerSuite = process.env.VERBLETS_AI_PER_SUITE && truthyValues.includes(process.env.VERBLETS_AI_PER_SUITE);
// const aiModeEnabled = false; // Temporarily disable to debug hanging tests
const aiModeEnabled = aiLogsOnly || aiPerSuite;

// Config for npm run examples - runs *.examples.js in Node
export default defineConfig({
  test: {
    ...baseConfig,
    environment: 'node',
    include: ['src/**/*.examples.js'],
    // Disable file parallelism to run tests sequentially and share Redis connection
    // fileParallelism: false, // Temporarily disabled to see if this affects output
    // Exclude hanging tests - uncomment as we identify working ones
    exclude: [
      ...baseConfig.exclude,
      // Start with all test files, then comment out as we verify they work
      
      // === CHAINS - Alphabetical ===
      'src/chains/anonymize/*.examples.js', // ISSUE: Hangs with aiMode - privacy model conflicts
      // 'src/chains/category-samples/*.examples.js', // ENABLED
      // 'src/chains/central-tendency/*.examples.js', // ENABLED
      // 'src/chains/collect-terms/*.examples.js', // ENABLED
      'src/chains/conversation/*.examples.js', // KNOWN SLOW: 5+ seconds
      // 'src/chains/date/*.examples.js', // ENABLED
      'src/chains/detect-patterns/*.examples.js', // ISSUE: Hangs with aiMode
      // 'src/chains/detect-threshold/*.examples.js', // ENABLED - Was commented before
      // 'src/chains/disambiguate/*.examples.js', // ENABLED
      // 'src/chains/dismantle/*.examples.js',
      'src/chains/document-shrink/*.examples.js', // ISSUE: Hangs with aiMode
      // 'src/chains/entities/*.examples.js', // ENABLED
      // 'src/chains/expect/*.examples.js',
      // 'src/chains/filter/*.examples.js', // ENABLED
      // 'src/chains/filter-ambiguous/*.examples.js', // ENABLED
      // 'src/chains/find/*.examples.js', // ENABLED
      // 'src/chains/glossary/*.examples.js',
      // 'src/chains/group/*.examples.js',
      // 'src/chains/intersections/*.examples.js', // ENABLED - checking test counts
      // 'src/chains/join/*.examples.js',
      // 'src/chains/list/*.examples.js',
      // 'src/chains/map/*.examples.js',
      // 'src/chains/pop-reference/*.examples.js',
      // 'src/chains/questions/*.examples.js',
      // 'src/chains/reduce/*.examples.js',
      // 'src/chains/relations/*.examples.js',
      'src/chains/scale/*.examples.js', // ISSUE: Hangs with aiMode
      // 'src/chains/score/*.examples.js',
      'src/chains/set-interval/*.examples.js', // CHECK: Timer issues
      // 'src/chains/sort/*.examples.js',
      // 'src/chains/split/*.examples.js',
      // 'src/chains/summary-map/*.examples.js',
      // 'src/chains/themes/*.examples.js',
      'src/chains/timeline/*.examples.js', // ISSUE: Hangs with aiMode
      // 'src/chains/to-object/*.examples.js',
      // 'src/chains/truncate/*.examples.js',
      // 'src/chains/veiled-variants/*.examples.js',
      
      // === VERBLETS - Alphabetical ===
      // 'src/verblets/auto/*.examples.js',
      // 'src/verblets/bool/*.examples.js',
      // 'src/verblets/central-tendency-lines/*.examples.js',
      // 'src/verblets/commonalities/*.examples.js',
      // 'src/verblets/enum/*.examples.js',
      // 'src/verblets/expect/*.examples.js',
      // 'src/verblets/fill-missing/*.examples.js',
      // 'src/verblets/intent/*.examples.js',
      // 'src/verblets/list-expand/*.examples.js',
      // 'src/verblets/name/*.examples.js',
      // 'src/verblets/name-similar-to/*.examples.js',
      // 'src/verblets/number/*.examples.js',
      // 'src/verblets/number-with-units/*.examples.js',
      // 'src/verblets/schema-org/*.examples.js',
      // 'src/verblets/sentiment/*.examples.js',
      
      // === LIBS ===
      // 'src/lib/text-similarity/*.examples.js',
    ],
    includeTaskLocation: true, // for precise file/line in reporters (v3)
    // Only include setupFiles when AI mode is enabled
    ...(aiModeEnabled && { setupFiles: ['./src/chains/test-analysis/setup.js'] }),
    reporters: aiModeEnabled 
      ? ['./src/chains/test-analysis/index.js'] // Only our reporter in AI mode
      : ['default']
  },
});