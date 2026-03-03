import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'build/**', 'node_modules/**', '**/*.js', '**/*.mjs'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'prefer-const': 'warn',
      'no-useless-catch': 'warn',
      'no-constant-condition': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
);
