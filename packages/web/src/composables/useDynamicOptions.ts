/**
 * 动态选项加载 composable
 * 支持 API 请求和字典查找两种模式
 *
 * apiConfig 支持静态值或响应式 getter，当联动切换 API 配置时自动重新加载
 */
import { ref, inject, onMounted, watch, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import { FORM_GRID_CONTEXT_KEY, FORM_GRID_FORM_KEY } from '@/components/FormGrid/types'
import type { SchemaApiConfig, DictItem, FormData } from '@/components/FormGrid/types'
import { apiClient } from '@/utils/apiClient'
import { getCachedOptions, setCachedOptions } from '@/utils/optionsCache'
import { normalizeListResponse } from '@/utils/responseNormalizer'
import { executeWithRetry } from '@/utils/retryRequest'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('DynamicOptions')

export interface DynamicOptionsResult {
  options: Ref<DictItem[]>
  loading: Ref<boolean>
  error: Ref<string>
  reload: () => Promise<void>
}

export function useDynamicOptions(apiConfig: MaybeRefOrGetter<SchemaApiConfig | undefined>): DynamicOptionsResult {
  const options = ref<DictItem[]>([]) as Ref<DictItem[]>
  const loading = ref(false)
  const error = ref('')

  const context = inject(FORM_GRID_CONTEXT_KEY, null)
  const formData = inject<FormData>(FORM_GRID_FORM_KEY, {} as FormData)

  /** Replace ${fieldName} placeholders in param values with actual formData values */
  function interpolateParams(params: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && /\$\{(\w+)\}/.test(value)) {
        result[key] = value.replace(/\$\{(\w+)\}/g, (_, field: string) => {
          const fieldVal = formData[field]
          return fieldVal !== undefined && fieldVal !== null ? String(fieldVal) : ''
        })
      } else {
        result[key] = value
      }
    }
    return result
  }

  async function loadOptions() {
    const config = toValue(apiConfig)
    if (!config) return

    // 1. 优先从字典查找
    if (config.dictCode && context?.global?.dictMap) {
      const dictOptions = context.global.dictMap[config.dictCode]
      if (dictOptions) {
        options.value = dictOptions
        return
      }
    }

    if (!config.url) return

    // Interpolate template params (e.g. ${fieldName} → formData value)
    const resolvedParams = config.params ? interpolateParams(config.params) : undefined

    // 2. 查缓存 (use resolved params for cache key)
    const cached = getCachedOptions(config.url, resolvedParams)
    if (cached) {
      options.value = cached
      return
    }

    // 3. 发起请求（支持重试）
    loading.value = true
    error.value = ''
    try {
      const method = config.method ?? 'get'
      const res: unknown = await executeWithRetry(
        () => apiClient.requestUrl(method, config.url, resolvedParams),
        { enableRetry: config.enableRetry },
      )

      // 归一化响应：支持 dataPath 配置或自动探测常见包装键
      const { data: rawList } = normalizeListResponse(res, { dataPath: config.dataPath })

      const labelKey = config.labelKey ?? 'label'
      const valueKey = config.valueKey ?? 'value'
      const childrenKey = config.childrenKey

      if (childrenKey) {
        // Tree mode: preserve nested structure
        const mapTree = (items: Record<string, unknown>[]): DictItem[] =>
          items.map((item) => ({
            label: String(item[labelKey] ?? ''),
            value: (item[valueKey] ?? item) as string | number | boolean,
            children: item[childrenKey] && Array.isArray(item[childrenKey])
              ? mapTree(item[childrenKey] as Record<string, unknown>[])
              : undefined,
          }))
        options.value = mapTree(rawList)
      } else {
        // Flat mode: no nesting
        options.value = rawList.map((item) => ({
          label: String(item[labelKey] ?? ''),
          value: (item[valueKey] ?? item) as string | number | boolean,
        }))
      }

      // 写缓存
      setCachedOptions(config.url, resolvedParams, options.value, config.ttl ?? 0)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '加载选项失败'
      logger.api(error.value)
    } finally {
      loading.value = false
    }
  }

  // 监听 apiConfig 变化，自动重新加载
  // 当联动切换 API 配置时触发
  watch(
    () => toValue(apiConfig),
    (newConfig, oldConfig) => {
      if (!newConfig) {
        options.value = []
        return
      }
      // 配置变化时重新加载（url 或 params 变化）
      const newKey = newConfig.dictCode ?? `${newConfig.url}:${JSON.stringify(newConfig.params ?? {})}`
      const oldKey = oldConfig
        ? (oldConfig.dictCode ?? `${oldConfig.url}:${JSON.stringify(oldConfig.params ?? {})}`)
        : ''
      if (newKey !== oldKey) {
        loadOptions()
      }
    },
  )

  const config = toValue(apiConfig)
  if (config?.immediate !== false) {
    onMounted(loadOptions)
  }

  return {
    options,
    loading,
    error,
    reload: loadOptions,
  }
}
