/**
 * Vite 配置工厂
 *
 * 各前端包的 vite.config.ts 调用 createViteConfig(appName, import.meta.url) 获取通用配置，
 * 再通过 mergeConfig 与自定义配置合并。
 */
import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { UserConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { type AppName, APP_CONFIGS, getApiProxyTarget } from '@schema-form/micro-app/config'

// 监视 workspace 包源码的 Vite 插件
// Vite 的 chokidar watcher 默认忽略 node_modules，导致 pnpm workspace 符号链接指向的源码变更无法触发 HMR
function workspaceWatchPlugin(monorepoRoot: string): Plugin {
  return {
    name: 'vite-plugin-workspace-watch',
    configureServer(server) {
      const packagesDir = join(monorepoRoot, 'packages')
      try {
        const dirs = readdirSync(packagesDir)
        for (const name of dirs) {
          const pkgDir = resolve(packagesDir, name)
          // 监视包的直接子目录（如 shared/config、shared/socket 等）
          try {
            const subDirs = readdirSync(pkgDir)
            for (const sub of subDirs) {
              const subPath = resolve(pkgDir, sub)
              try {
                if (statSync(subPath).isDirectory() && sub !== 'node_modules') {
                  server.watcher.add(subPath)
                }
              } catch {}
            }
          } catch {}
          // web/src 也需要监视（如 flow/web/src、editor/web/src）
          const webSrcDir = resolve(packagesDir, name, 'web', 'src')
          try {
            if (statSync(webSrcDir).isDirectory()) {
              server.watcher.add(webSrcDir)
            }
          } catch {}
        }
      } catch {}
    },
  }
}

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
  const monorepoRoot = fileURLToPath(new URL('../../..', callerImportMetaUrl))

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
      workspaceWatchPlugin(monorepoRoot),
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
        usePolling: true,
        interval: 300,
      },
      proxy: {
        '/api': {
          target: getApiProxyTarget(),
          changeOrigin: true,
          // SSE 流式传输：手动处理响应以避免 http-proxy 缓冲
          selfHandleResponse: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              const contentType = proxyRes.headers['content-type'] ?? ''
              const isSSE = contentType.includes('text/event-stream')

              // 透传响应头
              const headers = { ...proxyRes.headers }
              delete headers['content-encoding']
              delete headers['transfer-encoding']
              if (isSSE) {
                headers['cache-control'] = 'no-cache'
                headers['x-accel-buffering'] = 'no'
              }
              res.writeHead(proxyRes.statusCode ?? 200, headers)

              if (isSSE) {
                // SSE：逐 chunk 转发，不缓冲
                proxyRes.on('data', (chunk) => {
                  res.write(chunk)
                  // 强制刷新，确保 chunk 立即发送到浏览器
                  if (typeof (res as any).flush === 'function') {
                    (res as any).flush()
                  }
                })
                proxyRes.on('end', () => res.end())
                proxyRes.on('error', () => res.end())
              } else {
                // 非 SSE：正常 pipe
                proxyRes.pipe(res)
              }
            })
          },
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
