<script setup lang="ts">
/**
 * TableColumnsEditor -- CRUD editor for TableColumn[]
 *
 * Simplified column editor for the Table widget.
 * Each column row has: prop, label, width, fixed.
 */
import type { TableColumn } from '../../widgets/table/config'
import styles from './TableColumnsEditor.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

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
          <el-button
            size="small"
            link
            :disabled="idx === 0"
            @click="moveUp(idx)"
          >
            <AppIcon name="arrow-up" />
          </el-button>
          <el-button
            size="small"
            link
            :disabled="idx === columns.length - 1"
            @click="moveDown(idx)"
          >
            <AppIcon name="arrow-down" />
          </el-button>
          <el-button
            type="danger"
            size="small"
            link
            @click="removeColumn(idx)"
          >
            <AppIcon name="delete" />
          </el-button>
        </div>
      </div>

      <div :class="styles.field">
        <label :class="styles.label">字段名</label>
        <el-input
          :model-value="col.prop"
          size="small"
          placeholder="字段名"
          @update:model-value="updateColumn(idx, 'prop', $event)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.label">标签</label>
        <el-input
          :model-value="col.label"
          size="small"
          placeholder="显示标签"
          @update:model-value="updateColumn(idx, 'label', $event)"
        />
      </div>

      <div :class="styles.field">
        <label :class="styles.label">宽度</label>
        <el-input-number
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
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addColumn"
    >
      <AppIcon name="plus" />
      添加列
    </el-button>
  </div>
</template>
