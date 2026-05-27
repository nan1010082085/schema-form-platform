/**
 * 应用全局 Store
 *
 * 管理 qiankun 主应用注入的上下文（user / request / global）
 * 以及 FormGrid 渲染所需的聚合上下文
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserContext, RequestContext, GlobalContext, FormGridContext } from '@/components/WidgetRenderer/types'
import type { SchemaFormQiankunProps } from '@/types/qiankun'
import { extractAuthToken } from '@/utils/auth'

// ---- 默认值（冻结防止意外修改） ----

/**
 * 默认用户上下文（冻结防止意外修改）
 *
 * roles 数组额外内层冻结——数组的 push/pop 等变异方法
 * 不会被外层 Object.freeze 阻止，需单独保护。
 */
const DEFAULT_USER: Readonly<UserContext> = Object.freeze({
  id: '',
  name: '',
  deptId: '',
  deptName: '',
  roles: Object.freeze([]) as unknown as string[],
})

/**
 * 默认请求上下文（冻结防止意外修改）
 */
const DEFAULT_REQUEST: Readonly<RequestContext> = Object.freeze({
  token: '',
  headers: {},
  baseUrl: '',
})

/**
 * 默认全局上下文（冻结防止意外修改）
 */
const DEFAULT_GLOBAL: Readonly<GlobalContext> = Object.freeze({
  dictMap: {},
  config: {},
})

// ---- Store 定义 ----

export const useAppStore = defineStore('app', () => {
  const userContext = ref<UserContext>({ ...DEFAULT_USER })
  const requestContext = ref<RequestContext>({ ...DEFAULT_REQUEST })
  const globalContext = ref<GlobalContext>({ ...DEFAULT_GLOBAL })

  /** 聚合上下文，供 FormGrid 内部组件通过 inject 获取 */
  const formGridContext = computed<FormGridContext>(() => ({
    user: userContext.value,
    request: requestContext.value,
    global: globalContext.value,
  }))

  /**
   * 从 qiankun props 初始化应用上下文
   *
   * 在 qiankun mount 生命周期中调用。
   * 提取 user / request / global 三层上下文，并从 cookie 中提取 Sinosoft-Auth token。
   */
  function setQiankunProps(props: SchemaFormQiankunProps): void {
    try {
      // ---- 用户信息 ----
      if (props.user) {
        Object.assign(userContext.value, props.user)
      }

      // ---- 请求配置 ----
      if (props.request) {
        if (props.request.token) {
          requestContext.value.token = props.request.token
        }
        if (props.request.headers) {
          Object.assign(requestContext.value.headers, props.request.headers)
        }
        if (props.request.baseUrl) {
          requestContext.value.baseUrl = props.request.baseUrl
        }
      }

      // ---- 从 cookie 提取 Sinosoft-Auth token ----
      if (props.cookie) {
        const token = extractAuthToken(props.cookie)
        if (token) {
          requestContext.value.token = token
          requestContext.value.headers['Sinosoft-Auth'] = token
        }
      }

      // ---- 全局配置 ----
      if (props.global) {
        if (props.global.dictMap) {
          globalContext.value.dictMap = props.global.dictMap
        }
        if (props.global.config) {
          Object.assign(globalContext.value.config, props.global.config)
        }
      }

      // ---- 全局状态变更监听 ----
      if (props.onGlobalStateChange) {
        props.onGlobalStateChange((state: Record<string, unknown>) => {
          try {
            if (state.user) {
              Object.assign(userContext.value, state.user)
            }
            if (state.request) {
              Object.assign(requestContext.value, state.request)
            }
            if (state.global) {
              Object.assign(globalContext.value, state.global)
            }
          } catch (err) {
            console.error('[AppStore] onGlobalStateChange handler error:', err)
          }
        })
      }
    } catch (err) {
      console.error('[AppStore] setQiankunProps failed:', err)
    }
  }

  /**
   * 更新请求上下文（部分更新）
   */
  function updateRequestContext(patch: Partial<RequestContext>): void {
    Object.assign(requestContext.value, patch)
  }

  /**
   * 更新全局上下文（部分更新）
   */
  function updateGlobalContext(patch: Partial<GlobalContext>): void {
    Object.assign(globalContext.value, patch)
  }

  return {
    userContext,
    requestContext,
    globalContext,
    formGridContext,
    setQiankunProps,
    updateRequestContext,
    updateGlobalContext,
  }
})
