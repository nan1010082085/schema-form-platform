<script setup lang="ts">
import { inject, computed, ref, onMounted, watch } from 'vue'
import { widgetDataKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useApiRequest } from '../../composables/useApiRequest'
import { useExposeWidget } from '../../composables/useExposeWidget'
import type { TableColumn } from './config'

const widgetData = inject(widgetDataKey)!
useExposeWidget(() => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
}))
const { isDisabled } = useWidgetRenderState()
const { fetchApi } = useApiRequest()

const columns = computed<TableColumn[]>(() => {
  return (widgetData.value.props?.columns as TableColumn[]) ?? []
})

const stripe = computed(() => (widgetData.value.props?.stripe as boolean) ?? true)
const border = computed(() => (widgetData.value.props?.border as boolean) ?? true)
const tableHeight = computed(() => (widgetData.value.props?.height as number) ?? 280)

const apiUrl = computed(() => widgetData.value.props?.apiUrl as string)
const apiMethod = computed(() => (widgetData.value.props?.apiMethod as string) ?? 'get')
const apiHeaders = computed(() => (widgetData.value.props?.apiHeaders as Record<string, string>) ?? {})
const responseDataPath = computed(() => widgetData.value.props?.responseDataPath as string)

const tableData = ref<Record<string, unknown>[]>([])
const loading = ref(false)

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
    tableData.value = Array.isArray(extracted) ? extracted as Record<string, unknown>[] : []
  } catch {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (apiUrl.value) {
    loadData()
  }
})

watch(apiUrl, () => {
  if (apiUrl.value) {
    loadData()
  } else {
    tableData.value = []
  }
})
</script>

<template>
  <el-table
    :data="tableData"
    :stripe="stripe"
    :border="border"
    :height="tableHeight"
    :loading="loading"
    :disabled="isDisabled"
    size="default"
  >
    <el-table-column
      v-for="col in columns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
      :fixed="col.fixed"
    />
  </el-table>
</template>
