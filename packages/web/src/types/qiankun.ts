// @ts-nocheck
/**
 * qiankun 主应用传递的 Props 类型
 * 与 msa-form 项目的 props 模式对齐
 */
import type { UserContext, RequestContext, GlobalContext, DictItem } from '@/components/WidgetRenderer/types'

export interface SchemaFormQiankunProps {
  /** 用户信息 */
  user?: Partial<UserContext>
  /** 请求配置 */
  request?: {
    token?: string
    headers?: Record<string, string>
    baseUrl?: string
  }
  /** 全局配置 */
  global?: {
    dictMap?: Record<string, DictItem[]>
    config?: Record<string, unknown>
  }
  /** Cookie 字符串（兼容 msa-form 的 Sinosoft-Auth 模式） */
  cookie?: string
  /** 路由基础路径 */
  routerBase?: string
  /** 公共方法 */
  commonFun?: Record<string, (...args: unknown[]) => unknown>
  /** localforage 实例 */
  localforage?: unknown
  /** 成功状态码 */
  success_status?: string
  /** 全局状态变更监听 */
  onGlobalStateChange?: (callback: (state: Record<string, unknown>) => void, immediate?: boolean) => void
  /** 设置全局状态 */
  setGlobalState?: (state: Record<string, unknown>) => void
  [key: string]: unknown
}
