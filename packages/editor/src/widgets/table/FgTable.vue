<script setup lang="ts">
import { inject, computed, reactive, watch, onMounted } from 'vue'
import { widgetDataKey } from '../base/types'
import { useListData } from '../../composables/useListData'
import { useExposeWidget } from '../../composables/useExposeWidget'
import type { ListApiConfig } from '../../components/WidgetRenderer/types'
import type { TableColumn, PaginationConfig, SelectionConfig } from './config'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

// ---- Schema config ----

const columns = computed<TableColumn[]>(() =>
  (widgetData.value.props?.columns as TableColumn[]) ?? [],
)

const stripe = computed(() => (widgetData.value.props?.stripe as boolean) ?? true)
const border = computed(() => (widgetData.value.props?.border as boolean) ?? true)
const tableHeight = computed(() => (widgetData.value.props?.height as number) ?? 280)
const globalSortable = computed(() => (widgetData.value.props?.sortable as boolean) ?? false)

const paginationConfig = computed<PaginationConfig>(() =>
  (widgetData.value.props?.pagination as PaginationConfig) ?? { enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] },
)

const selectionConfig = computed<SelectionConfig>(() =>
  (widgetData.value.props?.selection as SelectionConfig) ?? { enabled: false },
)

// ---- Build ListApiConfig from widget api or props ----

function buildListApiConfig(): ListApiConfig {
  const api = widgetData.value.api
  if (api?.url) {
    return {
      url: api.url,
      method: api.method ?? 'post',
      dataPath: api.dataPath,
      immediate: false,
    }
  }
  const props = widgetData.value.props
  const apiUrl = props?.apiUrl as string
  if (apiUrl) {
    return {
      url: apiUrl,
      method: ((props?.apiMethod as string) ?? 'get') as 'get' | 'post',
      dataPath: props?.responseDataPath as string,
      immediate: false,
    }
  }
  return { url: '', immediate: false }
}

const listApiConfig = reactive<ListApiConfig>(buildListApiConfig())

watch(
  () => [widgetData.value.api?.url, widgetData.value.props?.apiUrl],
  () => Object.assign(listApiConfig, buildListApiConfig()),
)

// ---- useListData composable ----

const {
  tableData,
  total,
  loading,
  currentPage,
  pageSize,
  selectedRows,
  setSearchParams,
  fetchData,
  handlePageChange,
  handleSizeChange,
  handleSortChange,
  handleSelectionChange,
  clearSelection,
} = useListData({
  listApi: listApiConfig,
  pageSize: paginationConfig.value.pageSize,
  autoLoad: false,
})

// Sync pageSize when pagination config changes
watch(
  () => paginationConfig.value.pageSize,
  (newSize) => { pageSize.value = newSize },
)

// ---- Expose widget state ----

useExposeWidget(() => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
  get selectedRows() { return selectedRows.value },
}))

// ---- Sort change wrapper (table order can be null) ----

function onSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
  handleSortChange({ prop, order: order ?? '' })
}

// ---- Default client-side filter method ----

function defaultFilterMethod(prop: string) {
  return (value: unknown, row: Record<string, unknown>) => row[prop] === value
}

// ---- Auto-load on mount ----

onMounted(() => {
  if (listApiConfig.url) {
    fetchData()
  }
})

// ---- Watch API URL changes ----

watch(
  () => listApiConfig.url,
  (url) => {
    if (url) fetchData()
    else tableData.value = []
  },
)

// ---- defineExpose for programmatic access ----

defineExpose({
  refresh: fetchData,
  setSearchParams,
  clearSelection,
})
</script>

<template>
  <div :class="styles.container">
    <el-table
      v-loading="loading"
      :data="tableData"
      :stripe="stripe"
      :border="border"
      :height="tableHeight"
      size="default"
      :class="styles.table"
      @sort-change="onSortChange"
      @selection-change="handleSelectionChange"
    >
      <!-- Selection column -->
      <el-table-column
        v-if="selectionConfig.enabled"
        type="selection"
        width="50"
        fixed="left"
      />

      <!-- Data columns -->
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :fixed="col.fixed"
        :sortable="col.sortable !== undefined ? col.sortable : (globalSortable ? 'custom' : false)"
        :filters="col.filters"
        :filter-method="col.filters ? (col.filterMethod ?? defaultFilterMethod(col.prop)) : undefined"
      />
    </el-table>

    <!-- Pagination -->
    <el-pagination
      v-if="paginationConfig.enabled && listApiConfig.url"
      :class="styles.pagination"
      :total="total"
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="paginationConfig.pageSizes"
      layout="prev, pager, next, sizes, jumper"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>
