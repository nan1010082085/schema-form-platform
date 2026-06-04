import { createVitestConfig } from '@schema-form/shared-config/vitest'

export default createVitestConfig({
  callerImportMetaUrl: import.meta.url,
  coverage: {
    include: ['src/**/*.{ts,vue}'],
    exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/main.ts'],
  },
})
