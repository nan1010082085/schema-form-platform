import { computed, ref, watch, type Ref } from 'vue'
import type { Widget } from './types'
import { useApiRequest } from '../../composables/useApiRequest'

export interface UseChartOptionOptions {
  widgetData: Ref<Widget>
  buildOption: (data: Record<string, unknown>[], props: Record<string, unknown>) => Record<string, unknown>
}

export function useChartOption({ widgetData, buildOption }: UseChartOptionOptions) {
  const { fetchApi } = useApiRequest()
  const loading = ref(false)
  const chartData = ref<Record<string, unknown>[]>([])

  const props = computed(() => widgetData.value.props ?? {})
  const staticData = computed(() => (props.value.staticData as Record<string, unknown>[]) ?? [])
  const apiUrl = computed(() => props.value.apiUrl as string)
  const apiMethod = computed(() => (props.value.apiMethod as string) ?? 'get')
  const apiHeaders = computed(() => (props.value.apiHeaders as Record<string, string>) ?? {})
  const responseDataPath = computed(() => props.value.responseDataPath as string)
  const rawOption = computed(() => (props.value.rawOption as Record<string, unknown>) ?? null)

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
    if (!apiUrl.value) return
    loading.value = true
    try {
      const result = await fetchApi(apiUrl.value, apiMethod.value, apiHeaders.value)
      const extracted = resolveDataPath(result, responseDataPath.value)
      chartData.value = Array.isArray(extracted) ? extracted as Record<string, unknown>[] : []
    } catch {
      chartData.value = []
    } finally {
      loading.value = false
    }
  }

  const chartOption = computed(() => {
    const data = apiUrl.value ? chartData.value : staticData.value
    if (!data || data.length === 0) return {}

    const option = buildOption(data, props.value)

    if (rawOption.value) {
      return deepMerge(option, rawOption.value)
    }
    return option
  })

  // Load API data on mount if URL is set
  if (apiUrl.value) {
    loadData()
  }
  watch(apiUrl, (url) => {
    if (url) loadData()
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
