<script setup lang="ts">
import { inject, computed, reactive, watch, onMounted } from 'vue'
import { widgetDataKey } from '../base/types'
import { EVENT_CONTEXT_KEY } from '../../components/WidgetRenderer/types'
import { useListData } from '../../composables/useListData'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { triggerWidgetEvent } from '../../engine/eventEngine'
import { evaluateCondition } from '../../engine/eventEngine'
import type { ListApiConfig } from '../../components/WidgetRenderer/types'
import type { AdvancedTableColumn, ActionButton, AdvPaginationConfig, AdvSelectionConfig } from './config'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const eventCtx = inject(EVENT_CONTEXT_KEY, null)

// ---- Schema config ----

const columns = computed<AdvancedTableColumn[]>(() =>
  (widgetData.value.props?.columns as AdvancedTableColumn[]) ?? [],
)

const toolbar = computed<ActionButton[]>(() =>
  (widgetData.value.props?.toolbar as ActionButton[]) ?? [],
)

const stripe = computed(() => (widgetData.value.props?.stripe as boolean) ?? true)
const border = computed(() => (widgetData.value.props?.border as boolean) ?? true)
const tableHeight = computed(() => (widgetData.value.props?.height as number) ?? 350)
const globalSortable = computed(() => (widgetData.value.props?.sortable as boolean) ?? false)

const paginationConfig = computed<AdvPaginationConfig>(() =>
  (widgetData.value.props?.pagination as AdvPaginationConfig) ?? { enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] },
)

const selectionConfig = computed<AdvSelectionConfig>(() =>
  (widgetData.value.props?.selection as AdvSelectionConfig) ?? { enabled: false },
)

// ---- Build ListApiConfig ----

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
  return { url: '', immediate: false }
}

const listApiConfig = reactive<ListApiConfig>(buildListApiConfig())

watch(
  () => widgetData.value.api?.url,
  () => Object.assign(listApiConfig, buildListApiConfig()),
)

// ---- useListData ----

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

watch(
  () => paginationConfig.value.pageSize,
  (newSize) => { pageSize.value = newSize },
)

// ---- Expose ----

useExposeWidget(() => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
  get selectedRows() { return selectedRows.value },
  get selectedCount() { return selectedRows.value.length },
}))

// ---- Sort ----

function onSortChange({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) {
  handleSortChange({ prop, order: order ?? '' })
  if (eventCtx) triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'sort-change')
}

// ---- Selection ----

function onSelectionChange(rows: Record<string, unknown>[]) {
  handleSelectionChange(rows)
  if (eventCtx) triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'selection-change')
}

// ---- Filter ----

function defaultFilterMethod(prop: string) {
  return (value: unknown, row: Record<string, unknown>) => row[prop] === value
}

// ---- Page change ----

function onPageChange(page: number) {
  handlePageChange(page)
  if (eventCtx) triggerWidgetEvent(widgetData.value, 'click', eventCtx, 'page-change')
}

// ---- Row click ----

function onRowClick(row: Record<string, unknown>) {
  if (eventCtx) {
    const ctx = { ...eventCtx, row, rowIndex: tableData.value.indexOf(row) }
    triggerWidgetEvent(widgetData.value, 'click', ctx, 'row-click')
  }
}

// ---- Toolbar button click ----

function handleToolbarClick(btn: ActionButton) {
  if (!eventCtx) return
  const ctx = {
    ...eventCtx,
    selectedRows: selectedRows.value,
    selectedCount: selectedRows.value.length,
    tableData: tableData.value,
  }
  // Quick confirm shortcut
  if (btn.confirm && !window.confirm(btn.confirm)) return
  triggerWidgetEvent(widgetData.value, 'click', ctx, `toolbar-${btn.key}`)
}

// ---- Row button click ----

function handleRowButtonClick(btn: ActionButton, row: Record<string, unknown>, rowIndex: number) {
  if (!eventCtx) return
  const ctx = {
    ...eventCtx,
    row,
    rowIndex,
    selectedRows: selectedRows.value,
    selectedCount: selectedRows.value.length,
    tableData: tableData.value,
  }
  // Quick confirm shortcut
  if (btn.confirm && !window.confirm(btn.confirm)) return
  triggerWidgetEvent(widgetData.value, 'click', ctx, `row-${btn.key}`)
}

// ---- Link click ----

function handleLinkClick(col: AdvancedTableColumn, row: Record<string, unknown>, rowIndex: number) {
  if (!eventCtx) return
  const ctx = {
    ...eventCtx,
    row,
    rowIndex,
    selectedRows: selectedRows.value,
    tableData: tableData.value,
  }
  triggerWidgetEvent(widgetData.value, 'click', ctx, `link-${col.prop}`)
}

// ---- Resolve tag type from colorMap ----

function getTagType(colorMap?: Record<string, string>, value?: unknown): string {
  if (!colorMap) return ''
  return (colorMap[String(value)] ?? '') as string
}

// ---- Resolve option label ----

function getOptionLabel(options?: Array<{ label: string; value: unknown }>, value?: unknown): string {
  if (!options) return String(value ?? '')
  const found = options.find(o => o.value === value)
  return found?.label ?? String(value ?? '')
}

// ---- Toolbar button visibility ----

function isToolbarVisible(btn: ActionButton): boolean {
  if (!btn.visibleCondition) return true
  const context = {
    selectedRows: selectedRows.value,
    selectedCount: selectedRows.value.length,
    tableData: tableData.value,
  }
  return evaluateCondition(btn.visibleCondition, context) === true
}

// ---- Row button visibility ----

function isRowButtonVisible(btn: ActionButton, row: Record<string, unknown>): boolean {
  if (!btn.visibleCondition) return true
  const context = { row, ...row }
  return evaluateCondition(btn.visibleCondition, context) === true
}

// ---- Tooltip content ----

function getTooltipContent(col: AdvancedTableColumn, row: Record<string, unknown>): string {
  if (col.tooltipField) return String(row[col.tooltipField] ?? '')
  return String(row[col.prop] ?? '')
}

// ---- Auto-load ----

onMounted(() => {
  if (listApiConfig.url) fetchData()
})

watch(
  () => listApiConfig.url,
  (url) => {
    if (url) fetchData()
    else tableData.value = []
  },
)

// ---- Expose methods ----

defineExpose({
  refresh: fetchData,
  setSearchParams,
  clearSelection,
})
</script>

<template>
  <div :class="styles.container">
    <!-- Toolbar -->
    <div v-if="toolbar.length > 0" :class="styles.toolbar">
      <template v-for="btn in toolbar" :key="btn.key">
        <el-button
          v-if="isToolbarVisible(btn)"
          :type="btn.type || undefined"
          :size="btn.size || 'default'"
          @click="handleToolbarClick(btn)"
        >
          {{ btn.label }}
        </el-button>
      </template>
    </div>

    <!-- Batch actions bar -->
    <div v-if="selectionConfig.enabled && selectedRows.length > 0" :class="styles.batchBar">
      <span :class="styles.batchInfo">已选 {{ selectedRows.length }} 项</span>
      <el-button size="small" text @click="clearSelection">取消选择</el-button>
    </div>

    <!-- Table -->
    <el-table
      v-loading="loading"
      :data="tableData"
      :stripe="stripe"
      :border="border"
      :height="tableHeight"
      size="default"
      :class="styles.table"
      @sort-change="onSortChange"
      @selection-change="onSelectionChange"
      @row-click="onRowClick"
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
        :min-width="col.minWidth"
        :fixed="col.fixed"
        :align="col.align"
        :sortable="col.sortable !== undefined ? col.sortable : (globalSortable ? 'custom' : false)"
        :filters="col.filters"
        :filter-method="col.filters ? (col.filterMethod ?? defaultFilterMethod(col.prop)) : undefined"
        :show-overflow-tooltip="col.showTooltip && col.render !== 'tooltip'"
      >
        <template #default="{ row, $index }">
          <!-- text (default) -->
          <template v-if="!col.render || col.render === 'text'">
            {{ row[col.prop] }}
          </template>

          <!-- tooltip -->
          <template v-else-if="col.render === 'tooltip'">
            <el-tooltip :content="getTooltipContent(col, row)" placement="top">
              <span>{{ row[col.prop] }}</span>
            </el-tooltip>
          </template>

          <!-- link -->
          <template v-else-if="col.render === 'link'">
            <el-link type="primary" @click.stop="handleLinkClick(col, row, $index)">
              {{ row[col.prop] }}
            </el-link>
          </template>

          <!-- tag -->
          <template v-else-if="col.render === 'tag'">
            <el-tag
              :type="getTagType(col.colorMap, row[col.prop]) as any"
              size="small"
            >
              {{ getOptionLabel(col.options as any, row[col.prop]) }}
            </el-tag>
          </template>

          <!-- badge -->
          <template v-else-if="col.render === 'badge'">
            <el-badge
              :type="getTagType(col.colorMap, row[col.prop]) as any"
              :value="getOptionLabel(col.options as any, row[col.prop])"
            />
          </template>

          <!-- image -->
          <template v-else-if="col.render === 'image'">
            <el-image
              :src="row[col.prop]"
              :style="{ width: (col.imageWidth || 40) + 'px', height: (col.imageWidth || 40) + 'px' }"
              fit="cover"
            />
          </template>

          <!-- buttons -->
          <template v-else-if="col.render === 'buttons'">
            <div :class="styles.cellButtons">
              <template v-for="btn in col.buttons" :key="btn.key">
                <el-button
                  v-if="isRowButtonVisible(btn, row)"
                  :type="btn.type || undefined"
                  :size="btn.size || 'small'"
                  link
                  @click.stop="handleRowButtonClick(btn, row, $index)"
                >
                  {{ btn.label }}
                </el-button>
              </template>
            </div>
          </template>

          <!-- custom -->
          <template v-else-if="col.render === 'custom'">
            <span>{{ row[col.prop] }}</span>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <el-pagination
      v-if="paginationConfig.enabled"
      :class="styles.pagination"
      :total="total"
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="paginationConfig.pageSizes"
      layout="prev, pager, next, sizes, jumper"
      @current-change="onPageChange"
      @size-change="handleSizeChange"
    />
  </div>
</template>
