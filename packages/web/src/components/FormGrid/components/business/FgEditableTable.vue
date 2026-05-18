<script setup lang="ts">
/**
 * FgEditableTable — 可编辑表格组件
 *
 * 独占一行（row）的表格，自定义表头，列内容可动态配置表单组件。
 * 支持全局校验、动态添加/删除行。
 *
 * Schema config:
 *   type: 'editable-table'
 *   field: string            — formData 中的字段名（数组）
 *   label: string            — 表格标题
 *   columns: EditableTableColumn[]  — 列定义
 *   props:
 *     maxRows: number        — 最大行数（默认 20）
 *     minRows: number        — 最小行数（默认 0）
 *     showIndex: boolean     — 是否显示序号（默认 true）
 *     addButtonText: string  — 添加按钮文案（默认 "添加行"）
 *     validateOnChange: boolean — 值变更时触发校验（默认 true）
 */
import { computed } from 'vue'
import type {
  FormSchemaItem,
  EditableTableColumn,
  DictItem,
} from '../../types'

// ---- Props ----
const props = withDefaults(defineProps<{
  /** 表格行数据（双向绑定） */
  modelValue?: Record<string, unknown>[]
  /** 完整的 schema 配置 */
  schema: FormSchemaItem
}>(), {
  modelValue: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>[]]
}>()

// ---- Schema-derived computed ----
const columns = computed<EditableTableColumn[]>(
  () => (props.schema.columns as EditableTableColumn[] | undefined) ?? [],
)

const showIndex = computed<boolean>(
  () => (props.schema.props?.showIndex as boolean | undefined) ?? true,
)

const maxRows = computed<number>(
  () => (props.schema.props?.maxRows as number | undefined) ?? 20,
)

const addButtonText = computed<string>(
  () => (props.schema.props?.addButtonText as string | undefined) ?? '添加行',
)

const label = computed<string>(
  () => (props.schema.label as string | undefined) ?? '',
)

const atMaxRows = computed(() => localData.value.length >= maxRows.value)

// ---- Local data with two-way sync via computed get/set ----
const localData = computed<Record<string, unknown>[]>({
  get: () => (props.modelValue ?? []) as Record<string, unknown>[],
  set: (val) => emit('update:modelValue', val),
})

// ---- Create empty row defaults from column definitions ----
function createEmptyRow(): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const col of columns.value) {
    row[col.prop] = col.type === 'number' ? undefined : ''
  }
  return row
}

// ---- Actions ----

/** Update a single cell value — produces a new array reference to trigger v-model sync */
function updateCell(rowIdx: number, prop: string, value: unknown) {
  const newData = localData.value.map((row, i) =>
    i === rowIdx ? { ...row, [prop]: value } : row,
  )
  localData.value = newData
}

/** Append a new empty row (respects maxRows limit) */
function addRow() {
  if (atMaxRows.value) return
  localData.value = [...localData.value, createEmptyRow()]
}

/** Remove a row by index */
function removeRow(rowIdx: number) {
  localData.value = localData.value.filter((_, i) => i !== rowIdx)
}

// ---- Helpers ----

/** Compute the CSS style for a column cell */
function columnStyle(col: EditableTableColumn): Record<string, string> {
  const style: Record<string, string> = {}
  if (col.width) {
    style.width = col.width
    style.flexShrink = '0'
  } else {
    style.flex = '1'
    style.minWidth = '0'
  }
  return style
}

/** Get select options (supports DictItem[] format) */
function getColumnOptions(col: EditableTableColumn): DictItem[] {
  return col.options ?? []
}

/** Get the required attribute for a column */
function isRequired(col: EditableTableColumn): boolean {
  return col.required === true || col.rules?.some((r) => r.required === true) === true
}
</script>

<template>
  <div class="fg-editable-table">
    <!-- Label (optional, displayed above the table) -->
    <div v-if="label" class="fg-editable-table__label">{{ label }}</div>

    <!-- Header row -->
    <div class="fg-editable-table__header">
      <span v-if="showIndex" class="fg-editable-table__header-cell fg-editable-table__cell--index">序号</span>
      <span
        v-for="col in columns"
        :key="col.prop"
        class="fg-editable-table__header-cell"
        :class="{ 'fg-editable-table__cell--required': isRequired(col) }"
        :style="columnStyle(col)"
      >
        {{ col.label }}
      </span>
      <span class="fg-editable-table__header-cell fg-editable-table__cell--actions">操作</span>
    </div>

    <!-- Data rows -->
    <div
      v-for="(row, rowIdx) in localData"
      :key="rowIdx"
      class="fg-editable-table__row"
      :class="{ 'fg-editable-table__row--stripe': rowIdx % 2 === 1 }"
    >
      <!-- Row index -->
      <span v-if="showIndex" class="fg-editable-table__cell fg-editable-table__cell--index">
        {{ rowIdx + 1 }}
      </span>

      <!-- Dynamic form component per column -->
      <div
        v-for="col in columns"
        :key="col.prop"
        class="fg-editable-table__cell"
        :style="columnStyle(col)"
      >
        <!-- input -->
        <el-input
          v-if="col.type === 'input'"
          :model-value="(row[col.prop] ?? '') as string"
          :placeholder="col.placeholder"
          clearable
          @update:model-value="(val: unknown) => updateCell(rowIdx, col.prop, val)"
        />

        <!-- number -->
        <el-input-number
          v-else-if="col.type === 'number'"
          :model-value="row[col.prop] as number | undefined"
          :placeholder="col.placeholder"
          controls-position="right"
          style="width: 100%"
          @update:model-value="(val: number | undefined) => updateCell(rowIdx, col.prop, val)"
        />

        <!-- select -->
        <el-select
          v-else-if="col.type === 'select'"
          :model-value="row[col.prop]"
          :placeholder="col.placeholder"
          clearable
          style="width: 100%"
          @update:model-value="(val: unknown) => updateCell(rowIdx, col.prop, val)"
        >
          <el-option
            v-for="opt in getColumnOptions(col)"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <!-- date -->
        <el-date-picker
          v-else-if="col.type === 'date'"
          :model-value="row[col.prop] as string"
          :placeholder="col.placeholder"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @update:model-value="(val: unknown) => updateCell(rowIdx, col.prop, val)"
        />

        <!-- textarea -->
        <el-input
          v-else-if="col.type === 'textarea'"
          :model-value="(row[col.prop] ?? '') as string"
          :placeholder="col.placeholder"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          @update:model-value="(val: unknown) => updateCell(rowIdx, col.prop, val)"
        />
      </div>

      <!-- Actions column -->
      <div class="fg-editable-table__cell fg-editable-table__cell--actions">
        <el-button
          type="danger"
          link
          @click="removeRow(rowIdx)"
        >
          删除
        </el-button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="localData.length === 0" class="fg-editable-table__empty">
      暂无数据，点击"{{ addButtonText }}"添加
    </div>

    <!-- Add row button -->
    <div class="fg-editable-table__footer">
      <el-button
        type="primary"
        :disabled="atMaxRows"
        @click="addRow"
      >
        {{ addButtonText }}
      </el-button>
      <span v-if="maxRows > 0" class="fg-editable-table__footer-hint">
        {{ localData.length }} / {{ maxRows }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fg-editable-table {
  width: 100%;
  background: #fff;
  border: 1px solid #d5dde3;
  border-radius: 4px;
  overflow: hidden;

  // ---- Label ----
  &__label {
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    border-bottom: 1px solid #d5dde3;
    background: #fafafa;
  }

  // ---- Header ----
  &__header {
    display: flex;
    align-items: center;
    background: #fafafa;
    border-bottom: 1px solid #d5dde3;
    min-height: 48px;
    padding: 0 12px;
    gap: 8px;
  }

  &__header-cell {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
    padding: 8px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &--required::after {
      content: ' *';
      color: #f56c6c;
    }
  }

  // ---- Data rows ----
  &__row {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 8px 12px;
    gap: 8px;
    border-bottom: 1px solid #ebedf3;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f7fa;
    }

    &--stripe {
      background-color: #fafafa;

      &:hover {
        background-color: #f5f7fa;
      }
    }

    &:last-child {
      border-bottom: none;
    }
  }

  // ---- Cells ----
  &__cell {
    display: flex;
    align-items: center;
    min-width: 0;

    .el-input,
    .el-input-number,
    .el-select,
    .el-date-picker {
      // Full width within cell
      width: 100%;

      // Ensure consistent 48px height for all form controls
      :deep(.el-input__wrapper),
      :deep(.el-input__inner) {
        height: 48px;
      }

      :deep(.el-input__wrapper) {
        min-height: 48px;
      }

      // Textarea auto-height override
      :deep(.el-textarea__inner) {
        min-height: 48px;
      }
    }
  }

  &__cell--index {
    flex: 0 0 48px;
    width: 48px;
    justify-content: center;
    color: #909399;
    font-size: 13px;
  }

  &__cell--actions {
    flex: 0 0 60px;
    width: 60px;
    justify-content: center;
  }

  // ---- Empty state ----
  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    color: #c0c4cc;
    font-size: 14px;
  }

  // ---- Footer (add button area) ----
  &__footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid #ebedf3;

    :deep(.el-button) {
      height: 48px;
    }
  }

  &__footer-hint {
    font-size: 13px;
    color: #c0c4cc;
  }
}
</style>
