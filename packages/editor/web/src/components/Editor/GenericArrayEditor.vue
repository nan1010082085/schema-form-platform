<script setup lang="ts">
/**
 * GenericArrayEditor -- 通用数组 CRUD 编辑器
 *
 * 根据 fields 声明动态渲染每个数组项的字段。
 * 支持 text / select / number / switch 四种字段类型。
 */
import { Plus, Delete, Top, Bottom } from '@element-plus/icons-vue'
import type { ArrayFieldSchema } from '../../widgets/base/types'

export type { ArrayFieldSchema }

const props = defineProps<{
  value: unknown[]
  fields: ArrayFieldSchema[]
  itemLabel?: string
}>()

const emit = defineEmits<{
  update: [value: unknown[]]
}>()

function createItem(): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const field of props.fields) {
    item[field.key] = field.default ?? (field.type === 'number' ? 0 : field.type === 'switch' ? false : '')
  }
  return item
}

function addItem() {
  emit('update', [...props.value, createItem()])
}

function removeItem(index: number) {
  emit('update', props.value.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.value]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update', updated)
}

function moveDown(index: number) {
  if (index >= props.value.length - 1) return
  const updated = [...props.value]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update', updated)
}

function updateField(index: number, fieldKey: string, fieldValue: unknown) {
  const updated = props.value.map((item, i) =>
    i === index ? { ...(item as Record<string, unknown>), [fieldKey]: fieldValue } : item,
  )
  emit('update', updated)
}

function getItemTitle(item: unknown, index: number): string {
  if (props.itemLabel) {
    const record = item as Record<string, unknown>
    const labelValue = record[props.itemLabel]
    if (labelValue) return String(labelValue)
  }
  return `${index + 1}`
}
</script>

<template>
  <div :class="$style.editor">
    <div v-if="value.length === 0" :class="$style.empty">
      暂无数据
    </div>

    <div
      v-for="(item, idx) in value"
      :key="idx"
      :class="$style.item"
    >
      <div :class="$style.itemHeader">
        <span :class="$style.itemTitle">#{{ getItemTitle(item, idx) }}</span>
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
            :disabled="idx === value.length - 1"
            @click="moveDown(idx)"
          />
          <el-button
            type="danger"
            :icon="Delete"
            size="small"
            text
            @click="removeItem(idx)"
          />
        </div>
      </div>

      <div
        v-for="field in fields"
        :key="field.key"
        :class="$style.field"
      >
        <label :class="$style.label">{{ field.label }}</label>

        <el-input
          v-if="field.type === 'text'"
          :model-value="(item as Record<string, unknown>)[field.key] as string"
          size="small"
          :placeholder="field.placeholder"
          @update:model-value="updateField(idx, field.key, $event)"
        />

        <el-input-number
          v-else-if="field.type === 'number'"
          :model-value="(item as Record<string, unknown>)[field.key] as number"
          controls-position="right"
          size="small"
          style="width: 100%"
          @update:model-value="updateField(idx, field.key, $event ?? 0)"
        />

        <el-select
          v-else-if="field.type === 'select'"
          :model-value="(item as Record<string, unknown>)[field.key]"
          size="small"
          style="width: 100%"
          @update:model-value="updateField(idx, field.key, $event)"
        >
          <el-option
            v-for="opt in field.options"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <el-switch
          v-else-if="field.type === 'switch'"
          :model-value="(item as Record<string, unknown>)[field.key] as boolean"
          size="small"
          @update:model-value="updateField(idx, field.key, $event)"
        />
      </div>
    </div>

    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      plain
      style="width: 100%; margin-top: 8px"
      @click="addItem"
    >
      添加
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
