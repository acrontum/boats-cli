import { default as acrLint } from '@acrontum/eslint-config';

export default [
  ...acrLint,
  {
    files: ['src/cli.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
];
