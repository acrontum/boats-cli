import { default as acrLint } from '@acrontum/eslint-config';

export default [
  ...acrLint,
  {
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
];
