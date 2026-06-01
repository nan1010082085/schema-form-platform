/**
 * Vite 配置工厂
 *
 * 各前端包的 vite.config.ts 调用 createViteConfig(appName, import.meta.url) 获取通用配置，
 * 再通过 mergeConfig 与自定义配置合并。
 */
import { fileURLToPath } from 'node:url'
import type { UserConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { type AppName, APP_CONFIGS, getApiProxyTarget } from '@schema-form/micro-app/config'

/**
 * 创建 Vite 通用配置
 *
 * @param appName - 应用名称（对应 APP_CONFIGS 中的 key）
 * @param callerImportMetaUrl - 调用方文件的 import.meta.url，用于解析 @ alias
 * @param overrides - 需要覆盖或扩展的 Vite 配置
 * @returns 完整的 Vite UserConfig
 */
export function createViteConfig(
  appName: AppName,
  callerImportMetaUrl: string,
  overrides: UserConfig = {},
): UserConfig {
  const appConfig = APP_CONFIGS[appName]
  const rootDir = fileURLToPath(new URL('.', callerImportMetaUrl))

  const base: UserConfig = {
    base: appConfig.basePath,
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag === 'micro-app',
          },
        },
      }) as Plugin,
    ],
    resolve: {
      alias: {
        '@': `${rootDir}src`,
      },
    },
    server: {
      port: appConfig.devPort,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      watch: {
        followSymlinks: true,
        usePolling: false,
      },
      proxy: {
        '/api': {
          target: getApiProxyTarget(),
          changeOrigin: true,
        },
      },
    },
  }

  return mergeConfig(base, overrides)
}

/**
 * 深度合并 Vite 配置
 *
 * 对 plugins 数组做拼接而非替换，对 server.headers / proxy 做浅合并。
 */
function mergeConfig(base: UserConfig, overrides: UserConfig): UserConfig {
  const result: UserConfig = { ...base }

  if (overrides.plugins && base.plugins) {
    result.plugins = [...base.plugins, ...overrides.plugins]
  }

  if (overrides.resolve?.alias && base.resolve?.alias) {
    result.resolve = {
      ...base.resolve,
      alias: { ...base.resolve.alias, ...overrides.resolve.alias },
    }
  }

  if (overrides.server && base.server) {
    result.server = {
      ...base.server,
      ...overrides.server,
      headers: {
        ...base.server.headers,
        ...overrides.server.headers,
      },
      proxy: {
        ...base.server.proxy,
        ...overrides.server.proxy,
      },
    }
  }

  if (overrides.build && base.build) {
    result.build = { ...base.build, ...overrides.build }
  }

  for (const key of Object.keys(overrides)) {
    if (!['plugins', 'resolve', 'server', 'build'].includes(key)) {
      ;(result as Record<string, unknown>)[key] = (overrides as Record<string, unknown>)[key]
    }
  }

  return result
}
