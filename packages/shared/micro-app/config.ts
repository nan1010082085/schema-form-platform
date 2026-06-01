/**
 * 微前端集中配置
 *
 * 所有子应用的端口、路径、URL 在此统一管理。
 * 宿主和子应用都应从这里读取配置，避免散落在各自的 .env 和 vite.config.ts 中。
 */

/** 应用名称（含宿主） */
export type AppName = 'editor' | 'flow' | 'ai' | 'portal'

/** 单个子应用的配置 */
export interface AppConfig {
  /** 子应用名称（micro-app 标识） */
  name: AppName
  /** URL 路径前缀（同时也是 vite base） */
  basePath: string
  /** 本地开发端口 */
  devPort: number
}

/**
 * 所有子应用配置表
 *
 * 新增子应用只需在此添加一条记录。
 */
export const APP_CONFIGS: Record<AppName, AppConfig> = {
  editor: { name: 'editor', basePath: '/editor/', devPort: 5100 },
  flow:   { name: 'flow',   basePath: '/flow/',   devPort: 5200 },
  ai:     { name: 'ai',     basePath: '/ai/',     devPort: 5300 },
  portal: { name: 'portal', basePath: '/',        devPort: 4000 },
}

/** API 服务端口 */
export const API_PORT = 3001

/**
 * 生成子应用的完整 URL
 *
 * - 开发环境：http://localhost:{devPort}{basePath}
 * - 生产环境：直接返回 basePath（同域部署）
 *
 * @param name 子应用名称
 * @param isDev 是否为开发环境（调用方从 import.meta.env.DEV 传入）
 */
export function getAppUrl(name: AppName, isDev: boolean): string {
  const config = APP_CONFIGS[name]
  return isDev
    ? `http://localhost:${config.devPort}${config.basePath}`
    : config.basePath
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
