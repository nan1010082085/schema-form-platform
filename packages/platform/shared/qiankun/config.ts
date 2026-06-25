/**
 * Qiankun 微前端集中配置
 *
 * 所有子应用的端口、路径、URL 在此统一管理。
 * 宿主和子应用都应从这里读取配置，避免散落在各自的 .env 和 vite.config.ts 中。
 *
 * - 生产环境：shell 从 /api/micro-apps 拉取完整配置，用 buildMicroAppUrl 生成 entry URL
 * - 开发环境：fallback 到 APP_CONFIGS 的 devPort 拼接 localhost URL
 */

// 浏览器环境声明（构建时 window 可能不存在）
declare const window: { location: { hostname: string; port: string; origin: string } } | undefined

/** 应用名称（含宿主） */
export type AppName = 'shell' | 'editor' | 'flow' | 'ai'

/** 单个子应用的配置（开发环境 fallback） */
export interface AppConfig {
  /** 子应用名称（qiankun 标识） */
  name: AppName
  /** URL 路径前缀（同时也是 vite base） */
  basePath: string
  /** 本地开发端口 */
  devPort: number
}

/**
 * 子应用配置表（仅用于开发环境 fallback）
 *
 * 生产环境由 /api/micro-apps 接口驱动，此表不作为运行时数据源。
 */
export const APP_CONFIGS: Record<AppName, AppConfig> = {
  shell:    { name: 'shell',    basePath: '/schema-platform/',              devPort: 5050 },
  editor:   { name: 'editor',   basePath: '/schema-platform/micro/editor/', devPort: 5100 },
  flow:     { name: 'flow',     basePath: '/schema-platform/micro/flow/',   devPort: 5200 },
  ai:       { name: 'ai',       basePath: '/schema-platform/micro/ai/',     devPort: 5300 },
}

/** API 服务端口 */
export const API_PORT = 3001

/**
 * 根据 activeRule 生成子应用的完整 entry URL
 *
 * - 开发环境：http://localhost:{devPort}{activeRule}/
 * - 生产环境：http://{hostname}:{port}{activeRule}/
 *
 * 用于 shell 从 /api/micro-apps 拿到 activeRule 后拼接 loadMicroApp 的 entry。
 *
 * @param activeRule 子应用激活规则（如 '/editor'、'/flow'）
 * @param isDev 是否为开发环境
 */
export function buildMicroAppUrl(activeRule: string, isDev: boolean): string {
  // 从 APP_CONFIGS 查找匹配的 devPort
  const config = Object.values(APP_CONFIGS).find(c =>
    c.basePath.includes(activeRule) || activeRule.includes(c.name),
  )

  if (isDev && config) {
    return `http://localhost:${config.devPort}${activeRule}/`
  }

  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${activeRule}/`
  }

  return `${activeRule}/`
}

/**
 * 生成子应用的完整 URL（向后兼容，子应用内部使用）
 *
 * @deprecated 新代码请用 buildMicroAppUrl(activeRule, isDev)
 * @param name 子应用名称
 * @param isDev 是否为开发环境
 */
export function getAppUrl(name: AppName, isDev: boolean): string {
  const config = APP_CONFIGS[name]
  if (isDev) {
    return `http://localhost:${config.devPort}${config.basePath}`
  }
  if (typeof window !== 'undefined' && window.location) {
    return `http://${window.location.hostname}:${window.location.port}${config.basePath}`
  }
  return config.basePath
}

/**
 * 获取 API 代理目标地址
 *
 * 用于各子应用 vite.config.ts 的 proxy.target。
 * 此函数仅在 vite dev server 启动时调用（Node.js 环境），
 * 因此始终返回本地 API 地址。
 */
export function getApiProxyTarget(): string {
  return `http://localhost:${API_PORT}`
}
