import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Scripts CJS de utilidad — no forman parte del bundle
    'scripts/**',
    'prisma/seed*.ts',
    'verify-seed.mjs',
  ]),
  // Reglas para la base de código existente:
  // react-hooks v6 (Next.js 16) introduce reglas nuevas — warn durante migración incremental
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      // react-hooks v6 nuevas reglas — degradar a warn hasta refactor incremental
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      // JSX — comillas sin escapar en código existente
      'react/no-unescaped-entities': 'warn',
    },
  },
])

export default eslintConfig
