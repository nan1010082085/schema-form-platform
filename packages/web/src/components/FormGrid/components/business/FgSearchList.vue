<script setup lang="ts">
/**
 * FgSearchList — Search list component
 *
 * Composes a full-featured list page from schema:
 *   1. Inline search form (searchFields)
 *   2. Button toolbar (buttons with action chains)
 *   3. Data table (FgTable with custom cell renders)
 *   4. Pagination (FgPagination)
 *
 * Self-contained — NOT wrapped in el-form-item by SchemaRender.
 */
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useListData } from '@/composables/useListData'

import { getRequestInstance } from '@/utils/request'
import { evaluateExpression } from '@/utils/expression'
import { executeActions, type ActionContext } from '@/utils/actionExecutor'
import { exportCsv, exportExcel, type ExportColumn } from '@/utils/exportUtils'
import { getNestedValue, normalizeListResponse } from '@/utils/responseNormalizer'
import {
  ACTION_EMIT_KEY,
  FORM_GRID_FORM_KEY,
  FORM_GRID_API_KEY,
} from '../../types'
import FgTable from './FgTable.vue'
import FgPagination from './FgPagination.vue'
import type {
  FormSchemaItem,
  FormData,
  FormGridApi,
  SearchListColumnSchema,
  SearchListRowAction,
  SearchFieldSchema,
  DictItem,
  SchemaButtonConfig,
  ListApiConfig,
  ActionEmitFn,
} from '../../types'

// ---- Props ----
const props = defineProps<{
  schema: FormSchemaItem
}>()

// ---- Injections ----
const emitAction = inject<ActionEmitFn>(ACTION_EMIT_KEY, () => {})
const formData = inject<FormData>(FORM_GRID_FORM_KEY, {} as FormData)
const formApi = inject<FormGridApi>(FORM_GRID_API_KEY, {
  validate: async () => true,
  validateField: async () => true,
  getFormData: () => ({} as FormData),
  resetFields: () => {},
})

const router = useRouter()


// ---- List API Config ----
const listApiConfig = computed<ListApiConfig>(() => ({
  url: props.schema.listApi?.url ?? '',
  method: props.schema.listApi?.method ?? 'post',
  extraParams: props.schema.listApi?.extraParams,
  pageParam: props.schema.listApi?.pageParam,
  sizeParam: props.schema.listApi?.sizeParam,
  dataPath: props.schema.listApi?.dataPath,
  totalPath: props.schema.listApi?.totalPath,
  immediate: props.schema.listApi?.immediate,
  resetOnSearch: props.schema.listApi?.resetOnSearch,
}))

/** Whether a real API is configured for list data */

// ---- List Data Composable ----
const {
  tableData,
  total,
  loading,
  error,
  fetchData,
  currentPage,
  pageSize,
  searchParams,
  handleSearch,
  handleReset,
  handlePageChange,
  handleSizeChange,
  handleSortChange,
  handleSelectionChange,
  selectedRows,
} = useListData({
  listApi: listApiConfig.value,
  pageSize: (props.schema.props?.pageSize as number | undefined) ?? 10,
  autoLoad: props.schema.listApi?.immediate !== false,
})

// ---- Mock Mode: local search/pagination state ----
const isLoading = computed(() => loading.value && tableData.value.length === 0)
const hasError = computed(() => error.value !== '')
const isEmpty = computed(() => !loading.value && tableData.value.length === 0)

// ---- Search Fields ----
const searchFields = computed<SearchFieldSchema[]>(
  () => (props.schema.searchFields as SearchFieldSchema[] | undefined) ?? [],
)

function getSearchFieldOptions(field: SearchFieldSchema): DictItem[] {
  return field.options ?? []
}

// ---- Table Columns ----
interface TableColumnConfig {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

const searchListColumns = computed<SearchListColumnSchema[]>(
  () => (props.schema.columns as SearchListColumnSchema[] | undefined) ?? [],
)

/** Convert SearchListColumnSchema to FgTable column format */
const tableColumns = computed<TableColumnConfig[]>(() => {
  return searchListColumns.value.map((col) => ({
    prop: col.prop,
    label: col.label,
    width: col.width,
    minWidth: col.minWidth,
    fixed: col.fixed,
    sortable: col.sortable,
    align: col.align,
  }))
})

/** Columns that need custom rendering (non-'text' render mode) */
const renderColumns = computed<SearchListColumnSchema[]>(() => {
  return searchListColumns.value.filter(
    (c) => c.render && c.render !== 'text',
  )
})

// ---- Row Actions ----
const rowActions = computed<SearchListRowAction[]>(
  () => (props.schema.rowActions as SearchListRowAction[] | undefined) ?? [],
)

const hasRowActions = computed(() => rowActions.value.length > 0)

const actionColumnWidth = computed(() => {
  return rowActions.value.length * 60 + 16
})

/** Evaluate an expression against a row's data (masquerades as formData) */
function evaluateRowExpression(
  expression: string | undefined,
  row: Record<string, unknown>,
): boolean {
  if (!expression) return true
  try {
    return evaluateExpression<boolean>(expression, {
      formData: row as unknown as FormData,
    })
  } catch {
    // Degrade: default to visible/enabled
    return true
  }
}

/** Get row actions visible for the given row */
function getVisibleRowActions(row: Record<string, unknown>): SearchListRowAction[] {
  return rowActions.value.filter((action) =>
    evaluateRowExpression(action.visibleOn, row),
  )
}

/** Check if a row action is disabled for the given row */
function isRowActionDisabled(
  action: SearchListRowAction,
  row: Record<string, unknown>,
): boolean {
  return !evaluateRowExpression(action.disabledOn, row)
}

/** Replace :paramName placeholders in URL with row values */
function interpolateUrl(url: string, row: Record<string, unknown>): string {
  return url.replace(/:(\w+)/g, (_, key: string) => String(row[key] ?? ''))
}

/** Execute a row action */
async function handleRowAction(
  action: SearchListRowAction,
  row: Record<string, unknown>,
  index: number,
) {
  // Confirm gate
  if (action.confirm) {
    try {
      await ElMessageBox.confirm(action.confirm, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return // User cancelled
    }
  }

  const payload = { row, index }

  try {
    switch (action.type) {
      case 'emit':
        emitAction(action.emitEvent ?? 'row-action', payload)
        break

      case 'api': {
        if (!action.apiUrl) {
          ElMessage.error('API 地址未配置')
          return
        }
        const http = getRequestInstance()
        const method = action.apiMethod ?? 'post'
        const url = interpolateUrl(action.apiUrl, row)
        const res: unknown =
          method === 'get'
            ? await http.get(url, { params: row })
            : await http.post(url, row)
        ElMessage.success('操作成功')
        emitAction('row-action-response', { action, row, index, response: res })
        // Reload list after API action
        handleSearch()
        break
      }

      case 'navigate': {
        if (action.navigatePath) {
          const path = interpolateUrl(action.navigatePath, row)
          await router.push({
            path,
            query: action.navigateQuery,
          })
        }
        break
      }

      case 'dialog': {
        emitAction('open-dialog', {
          title: action.dialogTitle ?? action.label,
          width: action.dialogWidth,
          schema: action.dialogSchema,
          row,
        })
        break
      }

      default:
        console.warn('[FgSearchList] 未知行操作类型:', (action as { type: string }).type)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '操作失败'
    ElMessage.error(message)
  }
}

// ---- Cell Render Helpers ----

/** Handle link cell click — emits action with column config and row data */
function handleCellLink(col: SearchListColumnSchema, row: Record<string, unknown>) {
  if (col.linkEvent) {
    emitAction(col.linkEvent, { column: col, row })
  }
}

/**
 * Get badge background color from column's colorMap.
 * Falls back to a default color (#409eff) if no mapping exists.
 */
function getBadgeColor(col: SearchListColumnSchema, row: Record<string, unknown>): string {
  const value = getNestedValue(row, col.prop)
  const key = String(value ?? '')
  if (col.colorMap && col.colorMap[key]) {
    return col.colorMap[key]
  }
  return '#409eff'
}

// ---- Button Toolbar ----

const toolbarButtons = computed<SchemaButtonConfig[]>(
  () => (props.schema.buttons as SchemaButtonConfig[] | undefined) ?? [],
)

// ---- Export ----

const exportColumns = computed<ExportColumn[]>(() =>
  searchListColumns.value.map((col) => ({
    prop: col.prop,
    label: col.label,
    render: col.render,
  })),
)

/**
 * Export current filtered data (all pages).
 * Fetches all data from the API with a large page size,
 * then triggers a browser download.
 */
async function handleExport(format: 'csv' | 'excel') {
  if (!listApiConfig.value.url) {
    ElMessage.warning('列表 API 未配置，无法导出')
    return
  }

  try {
    const http = getRequestInstance()
    const method = listApiConfig.value.method ?? 'post'

    // Fetch all data with a large page size
    const allParams: Record<string, unknown> = {
      ...(listApiConfig.value.extraParams ?? {}),
      ...searchParams,
    }
    const pageParam = listApiConfig.value.pageParam ?? 'page'
    const sizeParam = listApiConfig.value.sizeParam ?? 'size'
    allParams[pageParam] = 1
    allParams[sizeParam] = 99999

    const res: unknown =
      method === 'get'
        ? await http.get(listApiConfig.value.url, { params: allParams })
        : await http.post(listApiConfig.value.url, allParams)

    // Extract data array from response
    const obj = res as Record<string, unknown>
    const { data: rows } = normalizeListResponse(obj, { dataPath: listApiConfig.value.dataPath })

    if (rows.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    if (format === 'csv') {
      exportCsv(rows, { columns: exportColumns.value, filename: 'export.csv' })
      ElMessage.success(`已导出 ${rows.length} 行数据为 CSV`)
    } else {
      exportExcel(rows, { columns: exportColumns.value, filename: 'export.xls' })
      ElMessage.success(`已导出 ${rows.length} 行数据为 Excel`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '导出失败'
    ElMessage.error(msg)
  }
}

function handleButtonClick(btn: SchemaButtonConfig) {
  if (!btn.actions || btn.actions.length === 0) {
    emitAction('action', { type: 'emit', eventName: 'click', eventPayload: btn })
    return
  }

  const actionContext: ActionContext = {
    emit: emitAction,
    validate: formApi.validate,
    getFormData: () => ({ ...formData, selectedRows: selectedRows.value } as unknown as import('../../types').FormData),
    resetFields: formApi.resetFields,
    router,
    openDialog: (config) => emitAction('open-dialog', config),
    triggerUpload: () => emitAction('action', { type: 'upload' }),
  }

  executeActions(btn.actions, actionContext)
}

// ---- Template Helpers ----

function getSearchFieldValue(field: string): unknown {
  return searchParams[field]
}

function setSearchFieldValue(field: string, value: unknown) {
  searchParams[field] = value
}
</script>

<template>
  <div class="fg-search-list">
    <!-- 1. Search Area -->
    <div class="fg-search-list__search">
      <el-form :inline="true" :model="searchParams">
        <el-form-item
          v-for="field in searchFields"
          :key="field.field"
          :label="field.label"
        >
          <!-- input -->
          <el-input
            v-if="field.type === 'input'"
            :model-value="getSearchFieldValue(field.field)"
            :placeholder="field.placeholder"
            clearable
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          />
          <!-- number -->
          <el-input-number
            v-else-if="field.type === 'number'"
            :model-value="getSearchFieldValue(field.field) as number"
            @update:model-value="(val: number | undefined) => setSearchFieldValue(field.field, val)"
          />
          <!-- select -->
          <el-select
            v-else-if="field.type === 'select'"
            :model-value="getSearchFieldValue(field.field)"
            clearable
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          >
            <el-option
              v-for="opt in (getSearchFieldOptions(field) ?? field.options ?? [])"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <!-- radio -->
          <el-radio-group
            v-else-if="field.type === 'radio'"
            :model-value="getSearchFieldValue(field.field)"
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          >
            <el-radio
              v-for="opt in (getSearchFieldOptions(field) ?? field.options ?? [])"
              :key="String(opt.value)"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
          <!-- checkbox -->
          <el-checkbox-group
            v-else-if="field.type === 'checkbox'"
            :model-value="(getSearchFieldValue(field.field) as string[] | undefined) ?? []"
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          >
            <el-checkbox
              v-for="opt in (getSearchFieldOptions(field) ?? field.options ?? [])"
              :key="String(opt.value)"
              :label="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
          <!-- date -->
          <el-date-picker
            v-else-if="field.type === 'date'"
            :model-value="getSearchFieldValue(field.field) as string"
            type="date"
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          />
          <!-- date-range -->
          <el-date-picker
            v-else-if="field.type === 'date-range'"
            :model-value="(getSearchFieldValue(field.field) as [string, string] | undefined) ?? undefined"
            type="daterange"
            range-separator="-"
            @update:model-value="(val: unknown) => setSearchFieldValue(field.field, val)"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="height:48px" @click="handleSearch">Search</el-button>
          <el-button style="height:48px" @click="handleReset">Reset</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 2. Button Toolbar -->
    <div v-if="toolbarButtons.length > 0 || listApiConfig.url" class="fg-search-list__toolbar">
      <el-button
        v-for="(btn, idx) in toolbarButtons"
        :key="idx"
        :type="btn.buttonType ?? 'default'"
        @click="handleButtonClick(btn)"
      >
        {{ btn.text }}
      </el-button>
      <!-- Export buttons (shown when listApi is configured) -->
      <template v-if="listApiConfig.url">
        <el-button type="default" @click="handleExport('csv')">
          Export CSV
        </el-button>
        <el-button type="default" @click="handleExport('excel')">
          Export Excel
        </el-button>
      </template>
    </div>

    <!-- 3. Table Area -->

    <!-- a) Loading skeleton (first load, no data yet) -->
    <div v-if="isLoading" class="fg-search-list__skeleton">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- b) Error state -->
    <div v-else-if="hasError" class="fg-search-list__error">
      <div class="fg-search-list__error-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f56c6c" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <circle cx="12" cy="16.5" r="0.8" fill="#f56c6c" stroke="none" />
        </svg>
      </div>
      <div class="fg-search-list__error-text">{{ error }}</div>
      <el-button type="primary" size="small" @click="fetchData">重试</el-button>
    </div>

    <!-- c) Empty state -->
    <div v-else-if="isEmpty" class="fg-search-list__empty">
      <div class="fg-search-list__empty-icon">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#c0c4cc" stroke-width="1">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="3" x2="9" y2="9" />
          <line x1="15" y1="3" x2="15" y2="9" />
          <circle cx="8" cy="14" r="1" fill="#c0c4cc" stroke="none" />
          <line x1="11" y1="14" x2="18" y2="14" stroke-width="2" stroke-linecap="round" />
          <circle cx="8" cy="18" r="1" fill="#c0c4cc" stroke="none" />
          <line x1="11" y1="18" x2="18" y2="18" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
      <div class="fg-search-list__empty-text">
        {{ (schema.props?.emptyText as string) ?? '暂无数据' }}
      </div>
    </div>

    <!-- d) Data table -->
    <FgTable
      v-else
      :data="tableData"
      :columns="tableColumns"
      :show-selection="(schema.props?.showSelection as boolean) ?? false"
      :show-index="(schema.props?.showIndex as boolean) ?? true"
      :show-actions="false"
      :loading="loading && tableData.length > 0"
      :border="(schema.props?.border as boolean) ?? true"
      :stripe="(schema.props?.stripe as boolean) ?? true"
      :max-height="schema.props?.maxHeight as string | number"
      :empty-text="(schema.props?.emptyText as string) ?? 'No data'"
      :row-key="(schema.props?.rowKey as string) ?? 'id'"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <!-- Custom cell render slots -->
      <template
        v-for="col in renderColumns"
        :key="col.prop"
        #[col.prop]="{ row }"
      >
        <el-tooltip
          v-if="col.render === 'tooltip'"
          :content="String(getNestedValue(row, col.tooltipField ?? col.prop) ?? '')"
          placement="top"
        >
          <span class="fg-search-list__cell-text">
            {{ getNestedValue(row, col.prop) ?? '' }}
          </span>
        </el-tooltip>
        <el-tag
          v-else-if="col.render === 'tag'"
          :type="(col.colorMap?.[String(getNestedValue(row, col.prop))] ?? '') as 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''"
        >
          {{ getNestedValue(row, col.prop) ?? '' }}
        </el-tag>
        <el-link
          v-else-if="col.render === 'link'"
          type="primary"
          @click.stop="handleCellLink(col, row as Record<string, unknown>)"
        >
          {{ getNestedValue(row, col.prop) ?? '' }}
        </el-link>
        <el-image
          v-else-if="col.render === 'image'"
          :src="String(getNestedValue(row, col.prop) ?? '')"
          :style="{ width: (col.imageWidth ?? 40) + 'px', height: (col.imageWidth ?? 40) + 'px' }"
          fit="cover"
          preview-teleported
        />
        <!-- badge render: colored pill badge -->
        <span
          v-else-if="col.render === 'badge'"
          class="fg-search-list__badge"
          :style="{ background: getBadgeColor(col, row as Record<string, unknown>) }"
        >
          {{ getNestedValue(row, col.prop) ?? '' }}
        </span>
        <!-- custom render fallback: plain text -->
        <span v-else>
          {{ getNestedValue(row, col.prop) ?? '' }}
        </span>
      </template>

      <!-- Row actions column (rendered via FgTable's default slot → el-table's default slot) -->
      <template v-if="hasRowActions" #default>
        <el-table-column
          label="Actions"
          :width="actionColumnWidth"
          fixed="right"
        >
          <template #default="{ row, $index }">
            <el-button
              v-for="action in getVisibleRowActions(row as Record<string, unknown>)"
              :key="action.label"
              :type="action.buttonType ?? 'primary'"
              link
              size="small"
              :disabled="isRowActionDisabled(action, row as Record<string, unknown>)"
              @click.stop="handleRowAction(action, row as Record<string, unknown>, $index)"
            >
              {{ action.label }}
            </el-button>
          </template>
        </el-table-column>
      </template>
    </FgTable>

    <!-- 4. Pagination -->
    <FgPagination
      v-if="total > 0"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @update:current-page="handlePageChange"
      @update:page-size="handleSizeChange"
    />
  </div>
</template>

<style scoped lang="scss">
.fg-search-list {
  width: 100%;
  background: #fff;
  border-radius: 4px;

  &__search {
    padding: 16px 16px 0;
    background: #fafafa;
    border-radius: 4px;
    margin-bottom: 12px;

    .el-form-item {
      margin-bottom: 16px;
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__cell-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    color: #fff;
  }

  &__skeleton {
    padding: 24px;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 24px;
    color: #909399;
  }

  &__error-icon {
    opacity: 0.8;
  }

  &__error-text {
    font-size: 14px;
    color: #f56c6c;
    text-align: center;
    word-break: break-all;
    max-width: 400px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 24px;
  }

  &__empty-icon {
    opacity: 0.6;
  }

  &__empty-text {
    font-size: 14px;
    color: #c0c4cc;
  }
}
</style>
