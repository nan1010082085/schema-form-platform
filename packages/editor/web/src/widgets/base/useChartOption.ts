import { computed, ref, watch, type Ref } from 'vue'
import type { Widget, SchemaApiConfig } from './types'
import { useApiRequest } from '../../composables/useApiRequest'

export interface UseChartOptionOptions {
  widgetData: Ref<Widget>
  buildOption: (data: Record<string, unknown>[], props: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Resolve the effective API config for a chart widget.
 * Prefers widget.api (standard SchemaApiConfig from OptionsApiConfigDialog),
 * falls back to legacy props-based config (apiUrl/apiMethod/apiHeaders/responseDataPath).
 */
function resolveChartApi(widget: Widget): SchemaApiConfig | null {
  // Standard widget.api takes precedence
  if (widget.api?.url) return widget.api

  // Legacy props-based fallback
  const p = widget.props ?? {}
  const url = p.apiUrl as string
  if (!url) return null

  return {
    url,
    method: (p.apiMethod as 'get' | 'post') ?? 'get',
    headers: (p.apiHeaders as Record<string, string>) ?? {},
    dataPath: (p.responseDataPath as string) || undefined,
  }
}

export function useChartOption({ widgetData, buildOption }: UseChartOptionOptions) {
  const { fetchApi } = useApiRequest()
  const loading = ref(false)
  const chartData = ref<Record<string, unknown>[]>([])

  const props = computed(() => widgetData.value.props ?? {})
  const staticData = computed(() => (props.value.staticData as Record<string, unknown>[]) ?? [])
  const rawOption = computed(() => (props.value.rawOption as Record<string, unknown>) ?? null)

  const effectiveApi = computed(() => resolveChartApi(widgetData.value))
  const hasApi = computed(() => !!effectiveApi.value)

  function resolveDataPath(data: unknown, path: string): unknown {
    if (!path) return data
    return path.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
        return (obj as Record<string, unknown>)[key]
      }
      return undefined
    }, data)
  }

  async function loadData() {
    const api = effectiveApi.value
    if (!api) return
    loading.value = true
    try {
      const result = await fetchApi(
        api.url,
        api.method ?? 'get',
        api.headers ?? {},
        api.method === 'post' ? api.body : api.params,
      )
      const extracted = resolveDataPath(result, api.dataPath ?? '')
      chartData.value = Array.isArray(extracted) ? extracted as Record<string, unknown>[] : []
    } catch {
      chartData.value = []
    } finally {
      loading.value = false
    }
  }

  const chartOption = computed(() => {
    const data = hasApi.value ? chartData.value : staticData.value
    if (!data || data.length === 0) return {}

    const option = buildOption(data, props.value)

    if (rawOption.value) {
      return deepMerge(option, rawOption.value)
    }
    return option
  })

  // Load API data on mount if API is configured
  if (hasApi.value) {
    loadData()
  }
  watch(effectiveApi, (api) => {
    if (api) loadData()
    else chartData.value = []
  })

  return { chartOption, loading, chartData, loadData }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
      && source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
    } else {
      result[key] = source[key]
    }
  }
  return result
}
