/**
 * 表单生命周期钩子 composable
 *
 * 支持四种钩子：
 * - onFormMount: 表单挂载后触发（仅一次）
 * - onFieldChange: 字段值变化时触发（300ms 防抖，初始化阶段跳过）
 * - onBeforeSubmit: 提交前校验，返回 false 可阻止提交
 * - onAfterLoad: 数据回填完成后触发
 *
 * 设计要点：
 * 1. 钩子支持函数和字符串表达式两种模式（与 useLinkage 共享沙箱模式）
 * 2. onFieldChange 使用 300ms 防抖，避免频繁触发
 * 3. 初始化阶段通过 isInitialized flag 跳过 onFieldChange
 * 4. 所有钩子异常捕获并 console.error，不阻塞表单主流程
 */
import { onMounted, watch, ref } from 'vue'
import type {
  FormLifecycleConfig,
  FormData,
} from '@/components/WidgetRenderer/types'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('Lifecycle')

/** 生命周期钩子执行结果 */
export interface UseLifecycleReturn {
  /** 执行 onBeforeSubmit 钩子，返回 false 可阻止提交 */
  executeBeforeSubmit: () => Promise<boolean>
  /** 执行 onAfterLoad 钩子（loadApi 回填完成后调用） */
  executeAfterLoad: (data: FormData) => Promise<void>
}

/**
 * 编译字符串表达式为可执行函数
 * 沙箱限制：通过 new Function 创建，仅注入显式参数
 */
function compileExpression<T extends (...args: unknown[]) => unknown>(
  expression: string,
  paramNames: string[],
): T {
  try {
    return new Function(...paramNames, `"use strict"; ${expression}`) as T
  } catch {
    logger.error(`表达式编译失败: "${expression}"`)
    return ((() => {}) as unknown) as T
  }
}

/**
 * 安全执行钩子 — 统一处理函数/表达式两种模式和异常捕获
 *
 * @param hook - 钩子配置（函数或字符串表达式）
 * @param args - 传递给钩子的参数
 * @param paramNames - 字符串表达式的参数名列表
 * @returns 钩子返回值（onBeforeSubmit 场景需要 boolean）
 */
async function executeHook<R = void>(
  hook: ((...args: unknown[]) => R | Promise<R>) | string | undefined,
  args: unknown[],
  paramNames: string[],
): Promise<R | undefined> {
  if (!hook) return undefined

  try {
    let fn: (...args: unknown[]) => R | Promise<R>
    if (typeof hook === 'function') {
      fn = hook
    } else {
      fn = compileExpression<typeof fn>(hook, paramNames)
    }
    return await fn(...args)
  } catch (err) {
    logger.error('钩子执行异常:', err)
    return undefined
  }
}

/**
 * useLifecycle composable
 *
 * @param lifecycle - 生命周期钩子配置（可选，无配置时所有操作为空操作）
 * @param formData - 响应式表单数据
 * @returns 钩子执行方法
 */
export function useLifecycle(
  lifecycle: FormLifecycleConfig | undefined,
  formData: FormData,
): UseLifecycleReturn {
  // 初始化标记：onMounted 完成前的 watch 不触发 onFieldChange
  const isInitialized = ref(false)

  // ---- onFormMount: 挂载后触发一次 ----
  onMounted(async () => {
    if (lifecycle?.onFormMount) {
      await executeHook(lifecycle.onFormMount as ((...args: unknown[]) => unknown) | string | undefined, [formData], ['formData'])
    }
    // 标记初始化完成，后续字段变化才触发 onFieldChange
    isInitialized.value = true
  })

  // ---- onFieldChange: 深度监听 formData，300ms 防抖 ----
  if (lifecycle?.onFieldChange) {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    watch(
      () => formData,
      (newData, oldData) => {
        // 初始化阶段跳过
        if (!isInitialized.value) return

        // 找出变化的字段
        const allKeys = new Set([
          ...Object.keys(newData),
          ...(oldData ? Object.keys(oldData) : []),
        ])

        for (const key of allKeys) {
          if (newData[key] !== oldData?.[key]) {
            // 防抖：清除上一个定时器，设置新的 300ms 延迟
            if (debounceTimer) {
              clearTimeout(debounceTimer)
            }
            debounceTimer = setTimeout(() => {
              executeHook(
                lifecycle.onFieldChange! as ((...args: unknown[]) => unknown) | string,
                [key, newData[key], newData],
                ['field', 'value', 'formData'],
              )
            }, 300)
            // 只触发一次（取第一个变化的字段），防抖合并后续变化
            break
          }
        }
      },
      { deep: true },
    )
  }

  // ---- onBeforeSubmit: 提交前校验 ----
  async function executeBeforeSubmit(): Promise<boolean> {
    if (!lifecycle?.onBeforeSubmit) return true
    const result = await executeHook<boolean>(
      lifecycle.onBeforeSubmit as ((...args: unknown[]) => boolean | Promise<boolean>) | string | undefined,
      [formData],
      ['formData'],
    )
    // 未定义或异常时默认允许提交
    return result !== false
  }

  // ---- onAfterLoad: 数据回填完成后 ----
  async function executeAfterLoad(data: FormData): Promise<void> {
    if (lifecycle?.onAfterLoad) {
      await executeHook(lifecycle.onAfterLoad as ((...args: unknown[]) => unknown) | string | undefined, [data], ['formData'])
    }
  }

  return {
    executeBeforeSubmit,
    executeAfterLoad,
  }
}
