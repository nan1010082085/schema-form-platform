<script setup lang="ts">
/**
 * TableColumnsEditor -- CRUD editor for TableColumn[]
 *
 * Simplified column editor for the Table widget.
 * Each column row has: prop, label, width, fixed.
 */
import { Plus, Delete, Top, Bottom } from '@element-plus/icons-vue'
import type { TableColumn } from '../../widgets/table/config'

const props = defineProps<{
  columns: TableColumn[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: TableColumn[]]
}>()

const fixedOptions = [
  { label: '无', value: undefined as string | undefined },
  { label: '左', value: 'left' as const },
  { label: '右', value: 'right' as const },
]

function addColumn() {
  const col: TableColumn = {
    prop: '',
    label: '',
    width: undefined,
    fixed: undefined,
  }
  emit('update:columns', [...props.columns, col])
}

function removeColumn(index: number) {
  emit('update:columns', props.columns.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.columns]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:columns', updated)
}

function moveDown(index: number) {
  if (index >= props.columns.length - 1) return
  const updated = [...props.columns]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:columns', updated)
}

function updateColumn<K extends keyof TableColumn>(index: number, field: K, value: TableColumn[K]) {
  const updated = props.columns.map((col, i) =>
    i === index ? { ...col, [field]: value } : col,
  )
  emit('update:columns', updated)
}
</script>

<template>
  <div :class="$style.editor">
    <div v-if="columns.length === 0" :class="$style.empty">
      未配置列。
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      :class="$style.item"
    >
      <div :class="$style.itemHeader">
        <span :class="$style.itemTitle">列 {{ idx + 1 }}</span>
        <div :class="$style.itemActions">
          <el-button
            :icon="Top"
            size="small"
            text
            :disabled="idx === 0"
            @click="moveUp(idx)"
          />
          <el-button
            :icon="Bottom"
            size="small"
            text
            :disabled="idx === columns.length - 1"
            @click="moveDown(idx)"
          />
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeColumn(idx)"
          />
        </div>
      </div>

      <div :class="$style.field">
        <label :class="$style.label">字段名</label>
        <el-input
          :model-value="col.prop"
          size="small"
          placeholder="字段名"
          @update:model-value="updateColumn(idx, 'prop', $event)"
        />
      </div>

      <div :class="$style.field">
        <label :class="$style.label">标签</label>
        <el-input
          :model-value="col.label"
          size="small"
          placeholder="显示标签"
          @update:model-value="updateColumn(idx, 'label', $event)"
        />
      </div>

      <div :class="$style.field">
        <label :class="$style.label">宽度</label>
        <el-input-number
          :model-value="col.width"
          size="small"
          :min="0"
          :max="2000"
          placeholder="列宽度"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'width', $event ?? undefined)"
        />
      </div>

      <div :class="$style.field">
        <label :class="$style.label">固定列</label>
        <el-select
          :model-value="col.fixed"
          size="small"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'fixed', $event)"
        >
          <el-option
            v-for="opt in fixedOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addColumn"
    >
      添加列
    </el-button>
  </div>
</template>

<style module>
.editor {
  width: 100%;
}

.empty {
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  padding: 12px 0;
}

.item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  background: var(--el-fill-color-lighter);
}

.itemHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.itemTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.itemActions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.field {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  min-height: 32px;
}

.label {
  width: 60px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 32px;
}
</style>
