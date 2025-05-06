import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'bin/',
      'old-code/', // Temporarily ignore generators folder during refactoring
    ],
  },
  // Base JS config (applies to all non-ignored files initially)
  js.configs.recommended,
  // Base TS config (parser, plugin, basic rules - applies to TS files by default via tseslint.config)
  ...tseslint.configs.recommended, // Use the non-type-checked base first
  {
    // Configuration specific to TypeScript files for TYPE-CHECKED rules
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked, // Extend with type-checked rules HERE
      // Consider adding stylistic rules if desired: ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parserOptions: {
        project: true, // Automatically find tsconfig.json
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Customize TS rules here
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Keep as warn during upgrade
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Add/adjust other strict rules as needed
    },
  },
  {
    // Configuration specific to JavaScript config files (like this one)
    files: ['eslint.config.mjs', '**/*.js'], // Target JS/MJS files specifically
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module', // Default to module for .mjs
    },
    rules: {
      // JS-specific rules or overrides
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
  {
    // Specific override for commitlint.config.js (CommonJS)
    files: ['commitlint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  }
);
