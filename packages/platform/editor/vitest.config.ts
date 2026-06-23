import { createVitestConfig } from '@schema-form/platform-shared/config/vitest'

export default createVitestConfig({
  callerImportMetaUrl: import.meta.url,
  exclude: ['src/__tests__/backend-smoke.spec.ts'],
  coverage: {
    include: ['src/**/*.{ts,vue}'],
    exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/main.ts'],
    thresholds: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
})
