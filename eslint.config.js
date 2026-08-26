import tsParser from '@typescript-eslint/parser'
import sonarjs from 'eslint-plugin-sonarjs'

const COGNITIVE_COMPLEXITY_WARN_THRESHOLD = 15
const COGNITIVE_COMPLEXITY_REJECT_THRESHOLD = 23
const CYCLOMATIC_COMPLEXITY_WARN_THRESHOLD = 20

const rejectOnly = process.env.LINT_COMPLEXITY_REJECT_ONLY === '1'

export default [
  {
    ignores: [
      '.agents/**',
      'agent/skills/**',
      'convex/_generated/**',
      'dist/**',
      'node_modules/**',
      'src/routeTree.gen.ts',
      'tools/oxlint/anti-slop/**',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'convex/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      sonarjs,
      'sonarjs-hard': sonarjs,
    },
    rules: {
      complexity: rejectOnly
        ? 'off'
        : [
            'warn',
            {
              max: CYCLOMATIC_COMPLEXITY_WARN_THRESHOLD,
              variant: 'modified',
            },
          ],
      'sonarjs/cognitive-complexity': rejectOnly
        ? 'off'
        : ['warn', COGNITIVE_COMPLEXITY_WARN_THRESHOLD],
      'sonarjs-hard/cognitive-complexity': [
        'error',
        COGNITIVE_COMPLEXITY_REJECT_THRESHOLD,
      ],
    },
  },
]
