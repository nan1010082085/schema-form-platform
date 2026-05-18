<script setup lang="ts">
/**
 * FgTable — 通用表格组件（支持行内编辑）
 *
 * 两种模式：
 * 1. 传统模式：仅传 columns（旧 TableColumn 接口），纯展示
 * 2. 行内编辑模式：传 columnSchema（TableColumnSchema[]），支持单元格编辑 + 行操作
 *
 * 行内编辑交互：
 * - 单击可编辑单元格进入编辑态
 * - 失焦 / 回车 退出编辑态并保存
 * - Esc 取消编辑（恢复原值）
 * - Tab 切换到下一个可编辑单元格
 */
import { ref, computed, nextTick, inject, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useDynamicOptions } from '@/composables/useDynamicOptions'
import type {
  TableColumnSchema,
  TableRowAction,
  DictItem,
  FormGridContext,
} from '../../types'
import { FORM_GRID_CONTEXT_KEY } from '../../types'


// ---- 旧接口（向后兼容） ----
interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

// ---- Props ----
const props = withDefaults(defineProps<{
  /** 表格数据（传统模式直接传入，编辑模式通过 modelValue 双向绑定） */
  data?: Record<string, unknown>[]
  /** 旧版列定义（向后兼容） */
  columns?: TableColumn[]
  /** 新版列 Schema（行内编辑模式） */
  columnSchema?: TableColumnSchema[]
  /** 双向绑定的表格数据（编辑模式推荐使用） */
  modelValue?: Record<string, unknown>[]
  /** 新增行的默认值 */
  addDefault?: Record<string, unknown>
  /** 是否显示操作列 */
  showActions?: boolean
  /** 行操作配置 */
  actions?: TableRowAction[]
  /** 显示序号列 */
  showIndex?: boolean
  /** 显示选择列 */
  showSelection?: boolean
  /** 最大高度 */
  maxHeight?: string | number
  /** 是否有边框 */
  border?: boolean
  /** 是否斑马纹 */
  stripe?: boolean
  /** 行数据的唯一标识字段 */
  rowKey?: string
  /** 加载状态 */
  loading?: boolean
  /** 空数据文案 */
  emptyText?: string
}>(), {
  border: true,
  stripe: true,
  emptyText: '暂无数据',
})

const emit = defineEmits<{
  'selection-change': [rows: Record<string, unknown>[]]
  'row-click': [row: Record<string, unknown>, column: unknown, event: Event]
  'sort-change': [sort: { prop: string; order: string }]
  'update:modelValue': [value: Record<string, unknown>[]]
  /** 单元格值变更 */
  'cell-change': [rowIndex: number, prop: string, value: unknown, row: Record<string, unknown>]
}>()

// ---- 注入上下文（用于字典查找） ----
const context = inject<FormGridContext | null>(FORM_GRID_CONTEXT_KEY, null)

// ---- 数据源（优先 modelValue，回退 data，最后 mock） ----
const tableData = computed({
  get: () => {
    const real = props.modelValue !== undefined ? props.modelValue : props.data
    if (real !== undefined) return real
    return []
  },
  set: (val: Record<string, unknown>[]) => {
    emit('update:modelValue', val)
  },
})

// ---- 列定义（优先 columnSchema，回退 columns） ----
const effectiveColumns = computed<TableColumnSchema[]>(() => {
  if (props.columnSchema?.length) return props.columnSchema
  // 将旧 TableColumn 转换为 TableColumnSchema
  if (props.columns?.length) {
    return props.columns.map(col => ({
      ...col,
      type: 'text' as const,
      editable: false,
    }))
  }
  return []
})

// ---- 编辑态管理 ----
interface EditingCell {
  rowIndex: number
  prop: string
}

const editingCell = ref<EditingCell | null>(null)
/** 编辑态临时值（取消时可恢复） */
const editingValue = ref<unknown>(null)

/** 判断单元格是否处于编辑态 */
function isEditing(rowIndex: number, prop: string): boolean {
  return editingCell.value?.rowIndex === rowIndex && editingCell.value?.prop === prop
}

/** 进入编辑态 */
function startEdit(rowIndex: number, prop: string, currentValue: unknown) {
  const col = effectiveColumns.value.find(c => c.prop === prop)
  if (!col || col.editable === false || col.type === 'text') return

  editingCell.value = { rowIndex, prop }
  editingValue.value = currentValue

  // 自动聚焦编辑控件
  nextTick(() => {
    const inputEl = document.querySelector('.fg-table-editing .el-input__inner') as HTMLElement
      ?? document.querySelector('.fg-table-editing .el-input-number__inner') as HTMLElement
      ?? document.querySelector('.fg-table-editing input') as HTMLElement
    inputEl?.focus()
    ;(inputEl as HTMLInputElement)?.select?.()
  })
}

/** 保存编辑值并退出编辑态 */
function commitEdit(rowIndex: number, prop: string, value: unknown) {
  const data = [...tableData.value]
  if (!data[rowIndex]) return

  // 校验：失焦时触发
  const col = effectiveColumns.value.find(c => c.prop === prop)
  if (col) {
    const error = validateCell(col, value)
    if (error) {
      console.warn(`[FgTable] 行 ${rowIndex + 1} "${col.label}" 校验失败: ${error}`)
    }
  }

  // 更新行数据
  const updatedRow = { ...data[rowIndex], [prop]: value }
  data[rowIndex] = updatedRow
  tableData.value = data

  emit('cell-change', rowIndex, prop, value, updatedRow)

  editingCell.value = null
  editingValue.value = null
}

/** 取消编辑（恢复原值） */
function cancelEdit() {
  editingCell.value = null
  editingValue.value = null
}

/** 编辑态键盘事件处理 */
function handleEditKeydown(
  event: KeyboardEvent,
  rowIndex: number,
  prop: string,
  value: unknown,
) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitEdit(rowIndex, prop, value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    commitEdit(rowIndex, prop, value)
    // Tab 切换到下一个可编辑单元格
    nextTick(() => focusNextEditableCell(rowIndex, prop, event.shiftKey))
  }
}

/** 聚焦下一个可编辑单元格 */
function focusNextEditableCell(currentRow: number, currentProp: string, reverse: boolean) {
  const cols = effectiveColumns.value.filter(c => c.editable !== false && c.type !== 'text')
  if (!cols.length) return

  const currentColIdx = cols.findIndex(c => c.prop === currentProp)
  const data = tableData.value

  if (reverse) {
    // Shift+Tab：向前
    let colIdx = currentColIdx - 1
    let rowIdx = currentRow
    while (rowIdx >= 0) {
      while (colIdx >= 0) {
        startEdit(rowIdx, cols[colIdx].prop, data[rowIdx]?.[cols[colIdx].prop])
        return
      }
      rowIdx--
      colIdx = cols.length - 1
    }
  } else {
    // Tab：向后
    let colIdx = currentColIdx + 1
    let rowIdx = currentRow
    while (rowIdx < data.length) {
      while (colIdx < cols.length) {
        startEdit(rowIdx, cols[colIdx].prop, data[rowIdx]?.[cols[colIdx].prop])
        return
      }
      rowIdx++
      colIdx = 0
    }
  }
}

// ---- Select 动态选项（setup 阶段初始化，遵守 composable 调用规则） ----
const dynamicOptionsMap = new Map<string, ReturnType<typeof useDynamicOptions>>()

function initDynamicOptions(columns: TableColumnSchema[]) {
  for (const col of columns) {
    if (!col.api) continue
    const key = `${col.prop}:${col.api.url ?? col.api.dictCode ?? ''}`
    if (!dynamicOptionsMap.has(key)) {
      const api = col.api
      const result = useDynamicOptions(() => api)
      dynamicOptionsMap.set(key, result)
    }
  }
}

// 初始化 columnSchema 中已有 api 配置的列
if (props.columnSchema?.length) {
  initDynamicOptions(props.columnSchema)
}

// 响应式：列定义变化时重新初始化动态选项
watch(
  () => props.columnSchema,
  (newCols) => {
    if (newCols?.length) initDynamicOptions(newCols)
  },
  { deep: true },
)

function getColumnOptions(col: TableColumnSchema): DictItem[] {
  // 静态选项优先
  if (col.options?.length) return col.options

  // 动态 API 选项（从 setup 阶段初始化的 map 中获取）
  if (col.api) {
    const key = `${col.prop}:${col.api.url ?? col.api.dictCode ?? ''}`
    const cached = dynamicOptionsMap.get(key)
    if (cached) return cached.options.value
  }

  // 从全局字典查找
  if (col.api?.dictCode && context?.global?.dictMap) {
    const dictOptions = context.global.dictMap[col.api.dictCode]
    if (dictOptions) return dictOptions
  }

  return []
}

/** 获取 select 选项的显示文本 */
function getOptionLabel(col: TableColumnSchema, value: unknown): string {
  const options = getColumnOptions(col)
  const opt = options.find(o => o.value === value)
  return opt?.label ?? String(value ?? '')
}

// ---- 校验 ----
function validateCell(col: TableColumnSchema, value: unknown): string | null {
  if (!col.rules?.length) return null
  for (const rule of col.rules) {
    if (rule.required && (value === undefined || value === null || value === '')) {
      return (rule.message as string) ?? `${col.label}不能为空`
    }
    if (rule.pattern && typeof value === 'string' && !new RegExp(rule.pattern).test(value)) {
      return (rule.message as string) ?? `${col.label}格式不正确`
    }
  }
  return null
}

// ---- 行操作 ----
function handleAddRow(afterIndex?: number) {
  const data = [...tableData.value]
  const newRow: Record<string, unknown> = props.addDefault ? { ...props.addDefault } : {}
  // 为 columnSchema 中的字段设置默认空值
  for (const col of effectiveColumns.value) {
    if (!(col.prop in newRow)) {
      newRow[col.prop] = col.type === 'number' ? undefined : ''
    }
  }
  const insertIdx = afterIndex !== undefined ? afterIndex + 1 : data.length
  data.splice(insertIdx, 0, newRow)
  tableData.value = data
}

async function handleDeleteRow(rowIndex: number, confirmMsg?: string) {
  if (confirmMsg) {
    try {
      await ElMessageBox.confirm(confirmMsg, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return // 用户取消
    }
  }
  const data = [...tableData.value]
  data.splice(rowIndex, 1)
  tableData.value = data
}

function handleCopyRow(rowIndex: number) {
  const sourceRow = tableData.value[rowIndex]
  if (!sourceRow) return
  const data = [...tableData.value]
  // 深拷贝行数据
  const copiedRow = JSON.parse(JSON.stringify(sourceRow)) as Record<string, unknown>
  data.splice(rowIndex + 1, 0, copiedRow)
  tableData.value = data
}

function handleAction(type: 'add' | 'delete' | 'copy', rowIndex: number) {
  const actionConfig = props.actions?.find(a => a.type === type)
  switch (type) {
    case 'add':
      handleAddRow(rowIndex)
      break
    case 'delete':
      handleDeleteRow(rowIndex, actionConfig?.confirm)
      break
    case 'copy':
      handleCopyRow(rowIndex)
      break
  }
}
</script>

<template>
  <el-table
    class="fg-table"
    :data="tableData"
    :max-height="maxHeight"
    :border="border"
    :stripe="stripe"
    :row-key="rowKey"
    :loading="loading"
    :empty-text="emptyText"
    @selection-change="emit('selection-change', $event)"
    @row-click="emit('row-click', $event as any, $event as any, $event as any)"
    @sort-change="emit('sort-change', $event as any)"
  >
    <!-- 选择列 -->
    <el-table-column
      v-if="showSelection"
      type="selection"
      width="48"
      fixed="left"
    />
    <!-- 序号列 -->
    <el-table-column
      v-if="showIndex"
      type="index"
      label="序号"
      width="48"
      fixed="left"
    />

    <!-- 数据列 -->
    <el-table-column
      v-for="col in effectiveColumns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
      :min-width="col.minWidth ?? (col.editable !== false && col.type !== 'text' ? 150 : undefined)"
      :fixed="col.fixed"
      :sortable="col.sortable"
      :align="col.align"
      show-overflow-tooltip
    >
      <template #default="{ row, $index }">
        <!-- 编辑态 -->
        <div
          v-if="isEditing($index, col.prop)"
          class="fg-table-editing"
          @keydown="handleEditKeydown($event, $index, col.prop, row[col.prop])"
        >
          <!-- input -->
          <el-input
            v-if="col.type === 'input' || col.type === 'text'"
            :model-value="row[col.prop] as string"
            size="small"
            @update:model-value="commitEdit($index, col.prop, $event)"
            @blur="commitEdit($index, col.prop, row[col.prop])"
          />
          <!-- number -->
          <el-input-number
            v-else-if="col.type === 'number'"
            :model-value="row[col.prop] as number"
            size="small"
            controls-position="right"
            style="width: 100%"
            @update:model-value="commitEdit($index, col.prop, $event)"
            @blur="commitEdit($index, col.prop, row[col.prop])"
          />
          <!-- select -->
          <el-select
            v-else-if="col.type === 'select'"
            :model-value="row[col.prop]"
            size="small"
            style="width: 100%"
            @update:model-value="commitEdit($index, col.prop, $event)"
            @blur="commitEdit($index, col.prop, row[col.prop])"
          >
            <el-option
              v-for="opt in getColumnOptions(col)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <!-- date -->
          <el-date-picker
            v-else-if="col.type === 'date'"
            :model-value="row[col.prop] as string"
            type="date"
            size="small"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @update:model-value="commitEdit($index, col.prop, $event)"
            @blur="commitEdit($index, col.prop, row[col.prop])"
          />
        </div>

        <!-- 显示态 -->
        <div
          v-else
          class="fg-table-cell"
          :class="{
            'fg-table-cell--editable': col.editable !== false && col.type !== 'text',
          }"
          @click="col.editable !== false && col.type !== 'text' ? startEdit($index, col.prop, row[col.prop]) : undefined"
        >
          <!-- 自定义插槽 -->
          <slot v-if="$slots[col.prop]" :name="col.prop" :row="row" :column="col" :index="$index" />
          <!-- select 类型 或 有 api/options 的列：显示 label 翻译 -->
          <template v-else-if="col.type === 'select' || col.api || col.options?.length">
            {{ getOptionLabel(col, row[col.prop]) }}
          </template>
          <!-- 默认文本 -->
          <template v-else>
            {{ row[col.prop] ?? '' }}
          </template>
        </div>
      </template>
    </el-table-column>

    <!-- 操作列 -->
    <el-table-column
      v-if="showActions && actions?.length"
      label="操作"
      fixed="right"
      :width="actions.length * 60 + 16"
      align="center"
    >
      <template #default="{ row: _row, $index }">
        <div class="fg-table-actions">
          <template v-for="action in actions" :key="action.type">
            <el-button
              v-if="action.type === 'add'"
              type="primary"
              link
              size="small"
              @click.stop="handleAction('add', $index)"
            >
              {{ action.label ?? '新增' }}
            </el-button>
            <el-button
              v-else-if="action.type === 'copy'"
              type="primary"
              link
              size="small"
              @click.stop="handleAction('copy', $index)"
            >
              {{ action.label ?? '复制' }}
            </el-button>
            <el-button
              v-else-if="action.type === 'delete'"
              type="danger"
              link
              size="small"
              @click.stop="handleAction('delete', $index)"
            >
              {{ action.label ?? '删除' }}
            </el-button>
          </template>
        </div>
      </template>
    </el-table-column>

    <!-- 外部 slot 透传 -->
    <slot />
  </el-table>
</template>

<style scoped lang="scss">
.fg-table {
  width: 100%;

  .fg-table-cell {
    min-height: 24px;
    line-height: 24px;
    cursor: default;

    &--editable {
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 2px;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--el-fill-color-light);
      }
    }
  }

  .fg-table-editing {
    margin: -5px -8px;

    .el-input,
    .el-input-number,
    .el-select,
    .el-date-picker {
      width: 100%;
    }
  }

  .fg-table-actions {
    display: flex;
    justify-content: center;
    gap: 4px;
  }
}
</style>
