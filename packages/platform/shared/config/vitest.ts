/**
 * Vitest 配置工厂
 *
 * 各前端包的 vitest.config.ts 调用 createVitestConfig(import.meta.url) 获取通用配置，
 * 再按需覆盖 include / exclude / coverage 等。
 */
import { fileURLToPath } from 'node:url'
import type { UserConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export interface VitestConfigOptions {
  /** 调用方文件的 import.meta.url，用于解析 @ alias */
  callerImportMetaUrl: string
  /** 测试文件匹配模式，默认 ['src/**\/*.{test,spec}.{ts,tsx}'] */
  include?: string[]
  /** 排除的测试文件 */
  exclude?: string[]
  /** 覆盖率配置 */
  coverage?: {
    provider?: 'v8' | 'istanbul'
    include?: string[]
    exclude?: string[]
    thresholds?: {
      statements?: number
      branches?: number
      functions?: number
      lines?: number
    }
  }
}

/**
 * 创建 Vitest 通用配置
 *
 * @param options - 配置项，callerImportMetaUrl 为必填
 * @returns 完整的 Vitest UserConfig
 */
export function createVitestConfig(options: VitestConfigOptions): UserConfig {
  const {
    callerImportMetaUrl,
    include = ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude,
    coverage,
  } = options

  const rootDir = fileURLToPath(new URL('.', callerImportMetaUrl))

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': `${rootDir}src`,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include,
      ...(exclude ? { exclude } : {}),
      ...(coverage ? { coverage: { provider: 'v8', ...coverage } } : {}),
    },
  }
}
