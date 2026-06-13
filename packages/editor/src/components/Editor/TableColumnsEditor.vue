<script setup lang="ts">
/**
 * TableColumnsEditor -- CRUD editor for TableColumn[]
 *
 * Simplified column editor for the Table widget.
 * Each column row has: prop, label, width, fixed.
 */
import { AddIcon, DeleteIcon, UpIcon, DownIcon } from 'tdesign-icons-vue-next'
import type { TableColumn } from '../../widgets/table/config'
import styles from './TableColumnsEditor.module.scss'

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
  <div :class="styles.editor">
    <div v-if="columns.length === 0" :class="styles.empty">
      未配置列。
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      :class="styles.item"
    >
      <div :class="styles.itemHeader">
        <span :class="styles.itemTitle">列 {{ idx + 1 }}</span>
        <div :class="styles.itemActions">
          <t-button
            size="small"
            variant="text"
            :disabled="idx === 0"
            @click="moveUp(idx)"
          >
            <UpIcon />
          </t-button>
          <t-button
            size="small"
            variant="text"
            :disabled="idx === columns.length - 1"
            @click="moveDown(idx)"
          >
            <DownIcon />
          </t-button>
          <t-button
            theme="danger"
            size="small"
            variant="text"
            @click="removeColumn(idx)"
          >
            <DeleteIcon />
          </t-button>
        </div>
      </div>

      <div :class="styles.field">
        <label :class="styles.label">字段名</label>
        <t-input
          :model-value="col.prop"
          size="small"
          placeholder="字段名"
          @update:model-value="updateColumn(idx, 'prop', $event)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.label">标签</label>
        <t-input
          :model-value="col.label"
          size="small"
          placeholder="显示标签"
          @update:model-value="updateColumn(idx, 'label', $event)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.label">宽度</label>
        <t-input-number
          :model-value="col.width"
          size="small"
          controls-position="right"
          :min="0"
          :max="2000"
          placeholder="列宽度"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'width', $event ?? undefined)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.label">固定列</label>
        <t-select
          :model-value="col.fixed"
          size="small"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'fixed', $event)"
        >
          <t-option
            v-for="opt in fixedOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </div>
    </div>

    <t-button
      theme="primary"
      size="small"
      variant="outline"
      style="width: 100%; margin-top: 8px"
      @click="addColumn"
    >
      <AddIcon />
      添加列
    </t-button>
  </div>
</template>
