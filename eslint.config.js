import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

// Node 25+ requires `with { type: 'json' }` on JSON imports.
// Vite/vitest handle this via transform, but direct node execution fails without it.
// This rule prevents regressions — if a JSON import is missing the attribute,
// it will silently work in tests but break in production node invocations.
const requireJsonImportType = {
  meta: { type: 'problem', messages: { missing: 'JSON imports require: with { type: \'json\' }' } },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (!node.source?.value?.endsWith('.json')) return;
        const hasType = (node.attributes || []).some(
          (a) => a.key?.name === 'type' && a.value?.value === 'json',
        );
        if (!hasType) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

export default [
  js.configs.recommended,
  {
    ignores: ['src/test-setup/**', 'src/lib/automation-runner/loader*.js'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        AbortController: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    plugins: {
      prettier: prettierPlugin,
      local: { rules: { 'require-json-import-type': requireJsonImportType } },
    },
    rules: {
      'prettier/prettier': 'error',
      'local/require-json-import-type': 'error',

      // TODO: Remove console statements and replace with proper logging
      'no-console': 'off',

      // TODO: Refactor await-in-loop patterns to use Promise.all()
      'no-await-in-loop': 'off',

      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'require-await': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'array-callback-return': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'Use Object.{keys,values,entries} instead of for..in',
        },
        {
          selector: 'WithStatement',
          message: '`with` is not allowed',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.js', '**/*.test.js', '**/*.examples.js'],
    rules: {
      'require-await': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern:
            '^(aiExpect|beforeAll|longTestTimeout|env|expect|aiExpectVerblet|formatIndentedLines|isRelevantForAnalysis|expectLocation|asXML|isTestStart)$',
        },
      ],
    },
  },
  prettierConfig,
];
