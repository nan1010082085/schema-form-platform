<script setup lang="ts">
/**
 * SearchFieldsEditor -- CRUD editor for SearchFieldSchema[].
 *
 * List-based editor for search-list inline search form fields.
 * Each field has add/remove/reorder with conditional options display
 * and full API configuration (url, method, params, dataPath, labelKey, valueKey).
 */
import type { SearchFieldSchema, DictItem, SchemaApiConfig } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const props = defineProps<{
  searchFields: SearchFieldSchema[]
}>()

const emit = defineEmits<{
  'update:searchFields': [fields: SearchFieldSchema[]]
}>()

const typeOptions = [
  { label: '输入框', value: 'input' as const },
  { label: '数字', value: 'number' as const },
  { label: '下拉选择', value: 'select' as const },
  { label: '单选', value: 'radio' as const },
  { label: '复选框', value: 'checkbox' as const },
  { label: '日期', value: 'date' as const },
  { label: '日期范围', value: 'date-range' as const },
]

/** Types that support static options */
const OPTION_TYPES = ['select', 'radio', 'checkbox'] as const

function needsOptions(type: string): boolean {
  return (OPTION_TYPES as readonly string[]).includes(type)
}

function addField() {
  const field: SearchFieldSchema = {
    type: 'input',
    field: '',
    label: '',
    span: 8,
    placeholder: '',
  }
  emit('update:searchFields', [...props.searchFields, field])
}

function removeField(index: number) {
  emit('update:searchFields', props.searchFields.filter((_, i) => i !== index))
}

function moveUp(index: number) {
  if (index === 0) return
  const updated = [...props.searchFields]
  ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
  emit('update:searchFields', updated)
}

function moveDown(index: number) {
  if (index >= props.searchFields.length - 1) return
  const updated = [...props.searchFields]
  ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
  emit('update:searchFields', updated)
}

function updateField<K extends keyof SearchFieldSchema>(index: number, field: K, value: SearchFieldSchema[K]) {
  const updated = props.searchFields.map((f, i) =>
    i === index ? { ...f, [field]: value } : f,
  )
  emit('update:searchFields', updated)
}

/** Parse options text (one per line: label=value) into DictItem[] */
function parseOptionsText(text: string): DictItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) return { label: line, value: line }
      return { label: line.slice(0, eqIdx).trim(), value: line.slice(eqIdx + 1).trim() }
    })
}

function optionsToText(options?: DictItem[]): string {
  if (!options?.length) return ''
  return options.map((o) => `${o.label}=${o.value}`).join('\n')
}

function updateApiField(index: number, patch: Partial<SchemaApiConfig>) {
  const current: SchemaApiConfig | undefined = props.searchFields[index]?.api
  if (current) {
    updateField(index, 'api', { ...current, ...patch })
  } else {
    updateField(index, 'api', { url: '', ...patch } as SchemaApiConfig)
  }
}

function removeApi(index: number) {
  updateField(index, 'api', undefined)
}

/** Params text buffer per field index -- avoid mutating props directly during editing */
const paramsTextCache: Record<number, string> = {}

function getParamsText(idx: number, field: SearchFieldSchema): string {
  if (idx in paramsTextCache) return paramsTextCache[idx]
  const p = field.api?.params
  return p ? JSON.stringify(p, null, 2) : ''
}

function handleParamsChange(idx: number, text: string) {
  paramsTextCache[idx] = text
  if (!text.trim()) {
    updateApiField(idx, { params: undefined })
    return
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    updateApiField(idx, { params: parsed })
  } catch { /* invalid JSON -- don't update until valid */ }
}
</script>

<template>
  <div class="search-fields-editor">
    <div v-if="searchFields.length === 0" class="search-fields-editor__empty">
      未配置搜索字段。
    </div>

    <div
      v-for="(field, idx) in searchFields"
      :key="idx"
      class="search-fields-editor__item"
    >
      <div class="search-fields-editor__item-header">
        <span class="search-fields-editor__item-title">字段 {{ idx + 1 }}</span>
        <div class="search-fields-editor__item-actions">
          <el-button
            size="small"
            :icon="ArrowUp"
            text
            :disabled="idx === 0"
            @click="moveUp(idx)"
          />
          <el-button
            size="small"
            :icon="ArrowDown"
            text
            :disabled="idx === searchFields.length - 1"
            @click="moveDown(idx)"
          />
          <el-button
            size="small"
            :icon="Delete"
            type="danger"
            text
            @click="removeField(idx)"
          />
        </div>
      </div>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">类型</label>
        <el-select
          :model-value="field.type"
          size="small"
          style="width: 100%"
          @update:model-value="updateField(idx, 'type', $event)"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">字段</label>
        <el-input
          :model-value="field.field"
          size="small"
          placeholder="字段名"
          @update:model-value="updateField(idx, 'field', $event)"
        />
      </div>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">标签</label>
        <el-input
          :model-value="field.label"
          size="small"
          placeholder="显示标签"
          @update:model-value="updateField(idx, 'label', $event)"
        />
      </div>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">栅格 (1-24)</label>
        <el-input-number
          :model-value="field.span ?? 8"
          :min="1"
          controls-position="right"
          :max="24"
          size="small"
          style="width: 100%"
          @update:model-value="updateField(idx, 'span', $event)"
        />
      </div>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">占位符</label>
        <el-input
          :model-value="field.placeholder ?? ''"
          size="small"
          placeholder="占位符文本"
          @update:model-value="updateField(idx, 'placeholder', $event || undefined)"
        />
      </div>

      <template v-if="needsOptions(field.type)">
        <div class="search-fields-editor__field">
          <label class="search-fields-editor__label">选项 (label=value, 每行一个)</label>
          <el-input
            type="textarea"
            :model-value="optionsToText(field.options)"
            :rows="3"
            size="small"
            placeholder="选项A=opt_a&#10;选项B=opt_b"
            @update:model-value="updateField(idx, 'options', parseOptionsText($event))"
          />
        </div>

        <div class="search-fields-editor__api-section">
          <div class="search-fields-editor__field">
            <label class="search-fields-editor__label">接口地址</label>
            <el-input
              :model-value="field.api?.url ?? ''"
              size="small"
              placeholder="/api/options"
              @update:model-value="updateApiField(idx, { url: $event || '' })"
            />
          </div>

          <template v-if="field.api?.url">
            <div class="search-fields-editor__field">
              <label class="search-fields-editor__label">请求方法</label>
              <el-select
                :model-value="field.api?.method ?? 'get'"
                size="small"
                style="width: 100%"
                @update:model-value="updateApiField(idx, { method: $event as 'get' | 'post' })"
              >
                <el-option label="GET" value="get" />
                <el-option label="POST" value="post" />
              </el-select>
            </div>

            <div class="search-fields-editor__field">
              <label class="search-fields-editor__label">参数 (JSON)</label>
              <el-input
                type="textarea"
                :model-value="getParamsText(idx, field)"
                :rows="2"
                size="small"
                placeholder='{"key": "value"}'
                @update:model-value="handleParamsChange(idx, $event)"
              />
            </div>

            <div class="search-fields-editor__field">
              <label class="search-fields-editor__label">数据路径 (点号分隔)</label>
              <el-input
                :model-value="field.api?.dataPath ?? ''"
                size="small"
                placeholder="data"
                @update:model-value="updateApiField(idx, { dataPath: $event || undefined })"
              />
            </div>

            <div class="search-fields-editor__field api-config__field--row">
              <div style="flex: 1">
                <label class="search-fields-editor__label">标签字段</label>
                <el-input
                  :model-value="field.api?.labelKey ?? 'label'"
                  size="small"
                  placeholder="label"
                  @update:model-value="updateApiField(idx, { labelKey: $event || undefined })"
                />
              </div>
              <div style="flex: 1">
                <label class="search-fields-editor__label">值字段</label>
                <el-input
                  :model-value="field.api?.valueKey ?? 'value'"
                  size="small"
                  placeholder="value"
                  @update:model-value="updateApiField(idx, { valueKey: $event || undefined })"
                />
              </div>
            </div>

            <el-button size="small" type="danger" style="width:100%;margin-top:4px" @click="removeApi(idx)">
              移除 API
            </el-button>
          </template>
        </div>
      </template>

      <div class="search-fields-editor__field">
        <label class="search-fields-editor__label">默认值</label>
        <el-input
          :model-value="String(field.defaultValue ?? '')"
          size="small"
          placeholder="默认值"
          @update:model-value="updateField(idx, 'defaultValue', $event)"
        />
      </div>
    </div>

    <el-button
      type="primary"
      size="small"
      style="width: 100%; margin-top: 8px"
      :icon="Plus"
      @click="addField"
    >
      添加搜索字段
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.search-fields-editor {
  &__empty {
    text-align: center;
    color: #909399;
    font-size: 12px;
    padding: 12px 0;
  }

  &__item {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    background: #fafafa;
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__item-title {
    font-size: 12px;
    font-weight: 600;
    color: #303133;
  }

  &__item-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__field {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: #606266;
    margin-bottom: 3px;
  }

  &__api-section {
    margin-top: 4px;
    padding: 8px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }
}

.api-config__field--row {
  display: flex;
  gap: 8px;
}
</style>
