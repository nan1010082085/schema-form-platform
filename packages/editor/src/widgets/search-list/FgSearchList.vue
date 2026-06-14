<script setup lang="ts">
/**
 * FgSearchList — 搜索列表 Widget
 *
 * 职责：
 * - 根据 searchFields 配置渲染搜索表单
 * - 使用 useListData composable 管理数据加载、分页、排序、行选择
 * - 渲染 t-table + t-pagination + 批量操作栏
 * - 支持 events/api configPanels
 */
import { inject, ref, computed, watch } from 'vue'
import { widgetDataKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import type { SearchFieldConfig } from '../base/types'
import { useListData } from '@/composables/useListData'
import { useExposeWidget } from '@/composables/useExposeWidget'
import type { ListApiConfig } from '@/components/WidgetRenderer/types'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

// ---- Schema 配置 ----
const searchFields = computed<SearchFieldConfig[]>(() =>
  (widgetData.value.props?.searchFields as SearchFieldConfig[]) ?? []
)

const columns = computed(() =>
  (widgetData.value.props?.columns as Array<{ field: string; label: string; width?: string; sortable?: boolean }>) ?? []
)

const selectionEnabled = computed(() => {
  const sel = widgetData.value.props?.selection as { enabled?: boolean } | undefined
  return sel?.enabled === true
})

const sortable = computed(() => widgetData.value.props?.sortable === true)

const batchActions = computed(() =>
  (widgetData.value.props?.batchActions as Array<{ label: string; action: string }>) ?? []
)

// ---- 构建 ListApiConfig ----
const listApi = computed<ListApiConfig>(() => {
  const api = widgetData.value.api
  return {
    url: api?.url ?? '',
    method: api?.method ?? 'get',
    extraParams: api?.params as Record<string, unknown>,
    dataPath: api?.dataPath,
    totalPath: 'total',
    immediate: api?.immediate,
    resetOnSearch: true,
  }
})

// ---- useListData composable ----
const {
  tableData,
  total,
  loading,
  currentPage,
  pageSize,
  setSearchParams,
  fetchData,
  handleSearch: listHandleSearch,
  handleReset: listHandleReset,
  handlePageChange,
  handleSizeChange,
  handleSortChange,
  selectedRows,
  handleSelectionChange,
  clearSelection,
} = useListData({
  listApi: listApi.value,
  pageSize: (widgetData.value.props?.pageSize as number) || 10,
  autoLoad: false,
})

// 当 api 配置变化时重新加载
watch(() => widgetData.value.api, (api) => {
  if (api?.url && api?.immediate !== false) {
    fetchData()
  }
}, { deep: true })

// ---- 暴露到 exposed 系统 ----
useExposeWidget(() => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
  get selectedRows() { return selectedRows.value },
  get selectedCount() { return selectedRows.value.length },
}))

// ---- 搜索表单 ----
const searchModel = ref<Record<string, unknown>>({})

// 初始化搜索字段默认值
watch(searchFields, (fields) => {
  for (const f of fields) {
    if (searchModel.value[f.field] === undefined) {
      searchModel.value[f.field] = f.defaultValue ?? undefined
    }
  }
}, { immediate: true })

// 同步搜索模型到 searchParams
watch(searchModel, (model) => {
  setSearchParams({ ...model })
}, { deep: true })

// ---- 搜索/重置 ----
async function handleSearch() {
  listHandleSearch()
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'search')
  }
}

async function handleReset() {
  for (const key of Object.keys(searchModel.value)) {
    searchModel.value[key] = undefined
  }
  listHandleReset()
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'reset')
  }
}

// ---- 排序 ----
function onSortChange({ prop, order }: { prop: string; order: string | null }) {
  handleSortChange({ prop, order: order ?? '' })
  if (eventCtx) {
    triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'sort-change')
  }
}

// ---- 行选择 ----
function onSelectionChange(rows: Record<string, unknown>[]) {
  handleSelectionChange(rows)
  if (eventCtx) {
    triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'selection-change')
  }
}

// ---- 批量操作 ----
async function handleBatchAction(action: string) {
  if (eventCtx) {
    await triggerWidgetEvent(widgetData.value, 'click', eventCtx, `batch-${action}`)
  }
}

// ---- 初始加载 ----
const api = widgetData.value.api
if (api?.immediate !== false && api?.url) {
  fetchData()
}

// ---- 暴露方法 ----
defineExpose({
  search: handleSearch,
  reset: handleReset,
  reload: fetchData,
  getSearchParams: () => ({ ...searchModel.value }),
  setSearchParams: (params: Record<string, unknown>) => {
    Object.assign(searchModel.value, params)
  },
  getSelectedRows: () => selectedRows.value,
  clearSelection,
})
</script>

<template>
  <div :class="styles.container">
    <!-- 标题 -->
    <div :class="styles.header">
      <span :class="styles.title">{{ (widgetData.props?.title as string) || '列表' }}</span>
    </div>

    <!-- 搜索表单 -->
    <div v-if="searchFields.length > 0" :class="styles.searchBar">
      <template v-for="field in searchFields" :key="field.field">
        <div :class="styles.searchItem">
          <span v-if="field.label" :class="styles.searchLabel">{{ field.label }}</span>
          <t-input
            v-if="field.type === 'input'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请输入'"
            clearable
            size="default"
            @keyup.enter="handleSearch"
          />
          <t-input-number
            v-else-if="field.type === 'number'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请输入'"
            :min="field.min"
            :max="field.max"
            :step="field.step ?? 1"
            controls-position="right"
            size="default"
          />
          <t-select
            v-else-if="field.type === 'select'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请选择'"
            clearable
            size="default"
          >
            <t-option
              v-for="opt in (field.options || [])"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </t-select>
          <t-cascader
            v-else-if="field.type === 'cascader'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '请选择'"
            :options="(field.cascaderOptions as any) || []"
            clearable
            size="default"
          />
          <t-time-picker
            v-else-if="field.type === 'time-picker'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '选择时间'"
            clearable
            size="default"
          />
          <t-checkbox-group
            v-else-if="field.type === 'checkbox'"
            v-model="searchModel[field.field]"
            size="default"
          >
            <t-checkbox
              v-for="opt in (field.options || [])"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </t-checkbox-group>
          <t-date-picker
            v-else-if="field.type === 'date'"
            v-model="searchModel[field.field]"
            :placeholder="field.placeholder || '选择日期'"
            clearable
            size="default"
            format="YYYY-MM-DD"
          />
          <t-date-picker
            v-else-if="field.type === 'date-range'"
            v-model="searchModel[field.field]"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            clearable
            size="default"
            format="YYYY-MM-DD"
          />
        </div>
      </template>
      <div :class="styles.searchActions">
        <t-button type="primary" @click="handleSearch">搜索</t-button>
        <t-button @click="handleReset">重置</t-button>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectionEnabled && selectedRows.length > 0" :class="styles.batchBar">
      <span :class="styles.batchInfo">已选 {{ selectedRows.length }} 项</span>
      <t-button
        v-for="action in batchActions"
        :key="action.action"
        size="small"
        @click="handleBatchAction(action.action)"
      >
        {{ action.label }}
      </t-button>
      <t-button size="small" @click="clearSelection">取消选择</t-button>
    </div>

    <!-- 数据表格 -->
    <t-table
      :loading="loading"
      :data="tableData"
      :stripe="widgetData.props?.stripe !== false"
      :border="widgetData.props?.border !== false"
      :class="styles.table"
      @selection-change="onSelectionChange"
      @sort-change="onSortChange"
    >
      <t-table-column
        v-if="selectionEnabled"
        type="selection"
        width="50"
        fixed="left"
      />
      <t-table-column
        v-for="col in columns"
        :key="col.field"
        :prop="col.field"
        :label="col.label"
        :width="col.width"
        :sortable="(sortable || col.sortable) ? 'custom' : false"
      />
    </t-table>

    <!-- 分页 -->
    <t-pagination
      v-if="widgetData.props?.showPagination !== false"
      :total="total"
      :page-size="pageSize"
      :page-size-options="[10, 20, 50, 100]"
      :current="currentPage"
      :class="styles.pagination"
      show-page-size
      @current-change="handlePageChange"
      @page-size-change="handleSizeChange"
    />
  </div>
</template>
