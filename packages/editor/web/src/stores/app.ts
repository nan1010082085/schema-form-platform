/**
 * 应用全局 Store
 *
 * 管理应用上下文（user / request / global）
 * 以及 FormGrid 渲染所需的聚合上下文
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserContext, RequestContext, GlobalContext, FormGridContext } from '@/components/WidgetRenderer/types'

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
  permissions: Object.freeze([]) as unknown as string[],
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
    updateRequestContext,
    updateGlobalContext,
  }
})
