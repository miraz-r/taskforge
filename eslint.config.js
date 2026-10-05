import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'server/generated'] },

  // Browser application.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Server. No JSX, no DOM; Node globals instead of browser globals.
  // `scripts/` holds the development and test-runner entry points, which run in
  // the same Node environment as the server and are held to the same rules.
  {
    files: ['server/**/*.ts', 'scripts/**/*.ts', 'prisma.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
    rules: {
      // The server is the trust boundary; `any` erases the types that make the
      // authorization rules reviewable.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
