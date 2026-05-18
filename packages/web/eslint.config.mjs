import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // Vue 3 + TypeScript
    vue: true,
    typescript: true,

    // Formatting rules (Prettier-compatible)
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },

    // Ignore patterns
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.d.ts',
    ],
  },
  {
    // Project-specific rule overrides
    rules: {
      // Allow unused vars with underscore prefix
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Vue-specific
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',

      // Allow console in dev
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
)
