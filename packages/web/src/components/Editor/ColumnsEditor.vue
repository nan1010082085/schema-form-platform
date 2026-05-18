<script setup lang="ts">
/**
 * ColumnsEditor -- CRUD editor for SearchListColumnSchema[].
 *
 * Table-based inline editor for search-list column definitions.
 * Each column row has up/down reorder and delete buttons.
 */
import { Plus, Delete, Top, Bottom } from '@element-plus/icons-vue'
import type { SearchListColumnSchema, SchemaApiConfig } from '@/components/FormGrid/types'

const props = defineProps<{
  columns: SearchListColumnSchema[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: SearchListColumnSchema[]]
}>()

const renderOptions = [
  { label: 'Text', value: 'text' },
  { label: 'Tooltip', value: 'tooltip' },
  { label: 'Tag', value: 'tag' },
  { label: 'Link', value: 'link' },
  { label: 'Badge', value: 'badge' },
  { label: 'Image', value: 'image' },
  { label: 'Custom', value: 'custom' },
]

const fixedOptions = [
  { label: 'None', value: undefined as boolean | 'left' | 'right' | undefined },
  { label: 'Left', value: 'left' as const },
  { label: 'Right', value: 'right' as const },
]

const alignOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

function addColumn() {
  const col: SearchListColumnSchema = {
    prop: '',
    label: '',
    width: '',
    render: 'text',
    sortable: false,
    align: 'left',
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

function updateColumn<K extends keyof SearchListColumnSchema>(index: number, field: K, value: SearchListColumnSchema[K]) {
  const updated = props.columns.map((col, i) =>
    i === index ? { ...col, [field]: value } : col,
  )
  emit('update:columns', updated)
}

function updateColorMap(index: number, text: string) {
  if (!text.trim()) {
    updateColumn(index, 'colorMap', undefined)
    return
  }
  try {
    const parsed = JSON.parse(text) as Record<string, string>
    updateColumn(index, 'colorMap', parsed)
  } catch {
    // Keep invalid JSON until fixed by user; don't clobber colorMap
  }
}

function colorMapToText(cm?: Record<string, string>): string {
  if (!cm) return ''
  return JSON.stringify(cm, null, 2)
}

/** Check if render type needs colorMap editor */
function needsColorMap(render?: string): boolean {
  return render === 'tag' || render === 'badge'
}

/** Column API helpers */
function updateColumnApi(index: number, patch: Partial<SchemaApiConfig>) {
  const current: SchemaApiConfig | undefined = props.columns[index]?.api
  if (current) {
    updateColumn(index, 'api', { ...current, ...patch })
  } else {
    updateColumn(index, 'api', { url: '', ...patch } as SchemaApiConfig)
  }
}

function removeColumnApi(index: number) {
  updateColumn(index, 'api', undefined)
}

const apiParamsCache: Record<number, string> = {}

function getApiParamsText(idx: number): string {
  if (idx in apiParamsCache) return apiParamsCache[idx]
  const p = props.columns[idx]?.api?.params
  return p ? JSON.stringify(p, null, 2) : ''
}

function handleApiParamsChange(idx: number, text: string) {
  apiParamsCache[idx] = text
  if (!text.trim()) {
    updateColumnApi(idx, { params: undefined })
    return
  }
  try {
    updateColumnApi(idx, { params: JSON.parse(text) as Record<string, unknown> })
  } catch { /* invalid JSON */ }
}
</script>

<template>
  <div class="columns-editor">
    <div v-if="columns.length === 0" class="columns-editor__empty">
      No columns configured.
    </div>

    <div
      v-for="(col, idx) in columns"
      :key="idx"
      class="columns-editor__item"
    >
      <div class="columns-editor__item-header">
        <span class="columns-editor__item-title">Column {{ idx + 1 }}</span>
        <div class="columns-editor__item-actions">
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

      <div class="columns-editor__field">
        <label class="columns-editor__label">Prop</label>
        <el-input
          :model-value="col.prop"
          size="small"
          placeholder="Field name"
          @update:model-value="updateColumn(idx, 'prop', $event)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Label</label>
        <el-input
          :model-value="col.label"
          size="small"
          placeholder="Display label"
          @update:model-value="updateColumn(idx, 'label', $event)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Width</label>
        <el-input
          :model-value="col.width ?? ''"
          size="small"
          placeholder="e.g. 120 or 120px"
          @update:model-value="updateColumn(idx, 'width', $event || undefined)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Min Width</label>
        <el-input
          :model-value="col.minWidth ?? ''"
          size="small"
          placeholder="e.g. 80"
          @update:model-value="updateColumn(idx, 'minWidth', $event || undefined)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Render</label>
        <el-select
          :model-value="col.render ?? 'text'"
          size="small"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'render', $event)"
        >
          <el-option
            v-for="opt in renderOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div v-if="needsColorMap(col.render)" class="columns-editor__field">
        <label class="columns-editor__label">Color Map (JSON)</label>
        <el-input
          :model-value="colorMapToText(col.colorMap)"
          type="textarea"
          :rows="2"
          size="small"
          placeholder='{"active":"success","inactive":"danger"}'
          @update:model-value="updateColorMap(idx, $event)"
        />
      </div>

      <!-- Column API config (for value-label mapping from remote) -->
      <div v-if="needsColorMap(col.render)" class="columns-editor__api-section">
        <div class="columns-editor__field">
          <label class="columns-editor__label">API URL (dynamic options)</label>
          <el-input
            :model-value="col.api?.url ?? ''"
            size="small"
            placeholder="/api/options"
            @update:model-value="updateColumnApi(idx, { url: $event || '' })"
          />
        </div>

        <template v-if="col.api?.url">
          <div class="columns-editor__field">
            <label class="columns-editor__label">Method</label>
            <el-select
              :model-value="col.api?.method ?? 'get'"
              size="small"
              style="width: 100%"
              @update:model-value="updateColumnApi(idx, { method: $event as 'get' | 'post' })"
            >
              <el-option label="GET" value="get" />
              <el-option label="POST" value="post" />
            </el-select>
          </div>

          <div class="columns-editor__field">
            <label class="columns-editor__label">Params (JSON)</label>
            <el-input
              :model-value="getApiParamsText(idx)"
              type="textarea"
              :rows="2"
              size="small"
              placeholder='{"key": "value"}'
              @update:model-value="handleApiParamsChange(idx, $event)"
            />
          </div>

          <div class="columns-editor__field">
            <label class="columns-editor__label">Data Path</label>
            <el-input
              :model-value="col.api?.dataPath ?? ''"
              size="small"
              placeholder="data"
              @update:model-value="updateColumnApi(idx, { dataPath: $event || undefined })"
            />
          </div>

          <div class="columns-editor__field api-config__field--row">
            <div style="flex: 1">
              <label class="columns-editor__label">Label Key</label>
              <el-input
                :model-value="col.api?.labelKey ?? 'label'"
                size="small"
                placeholder="label"
                @update:model-value="updateColumnApi(idx, { labelKey: $event || undefined })"
              />
            </div>
            <div style="flex: 1">
              <label class="columns-editor__label">Value Key</label>
              <el-input
                :model-value="col.api?.valueKey ?? 'value'"
                size="small"
                placeholder="value"
                @update:model-value="updateColumnApi(idx, { valueKey: $event || undefined })"
              />
            </div>
          </div>

          <el-button size="small" type="danger" plain style="width:100%;margin-top:4px" @click="removeColumnApi(idx)">
            Remove API
          </el-button>
        </template>
      </div>

      <!-- Render-specific fields -->
      <div v-if="col.render === 'tooltip'" class="columns-editor__field">
        <label class="columns-editor__label">Tooltip Field</label>
        <el-input :model-value="col.tooltipField ?? ''" size="small" placeholder="Field name for tooltip content" @update:model-value="updateColumn(idx, 'tooltipField', $event || undefined)" />
      </div>

      <div v-if="col.render === 'link'" class="columns-editor__field">
        <label class="columns-editor__label">Link Event</label>
        <el-input :model-value="col.linkEvent ?? ''" size="small" placeholder="Event name e.g. view" @update:model-value="updateColumn(idx, 'linkEvent', $event || undefined)" />
      </div>

      <div v-if="col.render === 'image'" class="columns-editor__field">
        <label class="columns-editor__label">Image Width (px)</label>
        <el-input-number :model-value="col.imageWidth ?? 40" :min="20" :max="400" size="small" style="width:100%" @update:model-value="updateColumn(idx, 'imageWidth', $event)" />
      </div>

      <div v-if="col.render === 'custom'" class="columns-editor__field">
        <label class="columns-editor__label">Render Function Name</label>
        <el-input :model-value="col.renderFn ?? ''" size="small" placeholder="Custom render function name" @update:model-value="updateColumn(idx, 'renderFn', $event || undefined)" />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Sortable</label>
        <el-switch
          :model-value="col.sortable ?? false"
          @update:model-value="updateColumn(idx, 'sortable', $event)"
        />
      </div>

      <div class="columns-editor__field">
        <label class="columns-editor__label">Fixed</label>
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

      <div class="columns-editor__field">
        <label class="columns-editor__label">Align</label>
        <el-select
          :model-value="col.align ?? 'left'"
          size="small"
          style="width: 100%"
          @update:model-value="updateColumn(idx, 'align', $event)"
        >
          <el-option
            v-for="opt in alignOptions"
            :key="opt.value"
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
      Add Column
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.columns-editor {
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
